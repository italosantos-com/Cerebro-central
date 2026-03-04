/**
 * Admin Flexible Authentication Service
 * Permite login com email, username ou telefone
 */

import { doc, getDoc, query, where, collection, getDocs } from "firebase/firestore";
import { signInWithEmailAndPassword, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

interface AdminData {
  uid: string;
  name?: string; // name is optional because it's not always present when resolving by username/phone
  username?: string;
  email: string;
  phone?: string;
  status?: string; // Added status property
  // Add other properties that might exist on an admin document if necessary
}

/**
 * Resolve o email do admin a partir de:
 * 1. Email direto (se contém @)
 * 2. Username (@nickname)
 * 3. Telefone
 */
export async function resolveAdminEmail(
  identifier: string
): Promise<{ email: string; uid: string } | null> {
  try {
    const identifier_trim = identifier.trim();

    // 1️⃣ Se contém @, é email direto
    if (identifier_trim.includes("@")) {
      console.log("[Admin Auth] Identificador é email direto");
      return null; // Será usado como está no login
    }

    // 2️⃣ Se começa com @, é username
    if (identifier_trim.startsWith("@")) {
      const username = identifier_trim.substring(1).toLowerCase();
      console.log("[Admin Auth] Resolvendo username:", username);

      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("username", "==", username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const adminData = snapshot.docs[0].data();
        console.log("[Admin Auth] Username resolvido para email:", adminData.email);
        return {
          email: adminData.email,
          uid: snapshot.docs[0].id,
        };
      } else {
        console.warn("[Admin Auth] Username não encontrado:", username);
        throw new Error("Username não encontrado");
      }
    }

    // 3️⃣ Se é numérico, é telefone
    if (/^\+?[\d\s()-]{10,}$/.test(identifier_trim)) {
      const phoneClean = identifier_trim.replace(/\D/g, ""); // Remove não-dígitos
      console.log("[Admin Auth] Resolvendo telefone:", phoneClean);

      // Formatos possíveis para busca:
      // +5521980246195, 5521980246195, 21980246195, 980246195
      const phoneVariants = [
        identifier_trim,                              // formato original
        phoneClean,                                   // apenas dígitos
        `+${phoneClean}`,                             // com +
        phoneClean.startsWith('55') ? `+${phoneClean}` : `+55${phoneClean}`, // com +55
      ];

      const adminsRef = collection(db, "admins");

      // Buscar todos os admins e comparar telefones normalizados
      const allAdminsSnapshot = await getDocs(adminsRef);

      for (const adminDoc of allAdminsSnapshot.docs) {
        const adminData = adminDoc.data();
        if (!adminData.phone) continue;

        const adminPhoneClean = String(adminData.phone).replace(/\D/g, "");

        // Comparar versões normalizadas
        if (phoneVariants.some(variant => {
          const variantClean = variant.replace(/\D/g, "");
          return variantClean === adminPhoneClean ||
            variantClean.endsWith(adminPhoneClean) ||
            adminPhoneClean.endsWith(variantClean);
        })) {
          console.log("[Admin Auth] Telefone resolvido para email:", adminData.email);
          return {
            email: adminData.email,
            uid: adminDoc.id,
          };
        }
      }

      console.warn("[Admin Auth] Telefone não encontrado:", identifier_trim);
      throw new Error("Telefone não encontrado");
    }

    // 4️⃣ Se não é email e não tem @, tenta como username sem @
    console.log("[Admin Auth] Tentando como username (sem @):", identifier_trim);
    const adminsRef = collection(db, "admins");
    const q = query(adminsRef, where("username", "==", identifier_trim.toLowerCase()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const adminData = snapshot.docs[0].data();
      console.log("[Admin Auth] Username resolvido para email:", adminData.email);
      return {
        email: adminData.email,
        uid: snapshot.docs[0].id,
      };
    }

    console.warn("[Admin Auth] Não foi possível resolver o identificador:", identifier_trim);
    return null;
  } catch (error) {
    console.error("[Admin Auth] Erro ao resolver identificador:", error);
    throw error;
  }
}

/**
 * Login flexível com email, @username ou telefone
 */
export async function flexibleAdminLogin(
  identifier: string,
  password: string
): Promise<{ user: User; admin: AdminData }> {
  try {
    console.log("[Admin Auth] Iniciando login flexível...");

    let loginEmail = identifier;

    // Se não for email, resolver para email
    if (!identifier.includes("@")) {
      console.log("[Admin Auth] Identificador não é email, resolvendo...");
      const resolved = await resolveAdminEmail(identifier);

      if (!resolved) {
        throw new Error(
          "Identificador não reconhecido. Use email, @username ou telefone."
        );
      }

      loginEmail = resolved.email;
    }

    // Fazer login com email resolvido
    console.log("[Admin Auth] Tentando login com email:", loginEmail);
    const credential = await signInWithEmailAndPassword(auth, loginEmail, password);

    // Buscar dados admin
    const adminRef = doc(db, "admins", credential.user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      throw new Error("Conta sem acesso de administrador");
    }

    console.log("[Admin Auth] ✅ Login bem-sucedido!");

    return {
      user: credential.user,
      admin: {
        uid: adminSnap.id,
        email: loginEmail, // Explicitly add email
        ...adminSnap.data(),
      } as AdminData,
    };
  } catch (error) {
    console.error("[Admin Auth] Erro no login flexível:", error);
    throw error;
  }
}

/**
 * Validar formato do identificador
 */
export function validateIdentifierFormat(identifier: string): {
  valid: boolean;
  type: "email" | "username" | "phone" | "invalid";
  message: string;
} {
  const id = identifier.trim();

  // Email
  if (id.includes("@")) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(id)) {
      return { valid: true, type: "email", message: "Email válido" };
    }
    return { valid: false, type: "invalid", message: "Email inválido" };
  }

  // Username
  if (id.startsWith("@")) {
    const username = id.substring(1);
    if (/^[a-z0-9-_]{3,20}$/.test(username)) {
      return { valid: true, type: "username", message: "Username válido" };
    }
    return { valid: false, type: "invalid", message: "Username inválido (3-20 caracteres)" };
  }

  // Telefone
  if (/^\+?[\d\s()-]{10,}$/.test(id)) {
    return { valid: true, type: "phone", message: "Telefone válido" };
  }

  // Username sem @
  if (/^[a-z0-9-_]{3,20}$/.test(id)) {
    return { valid: true, type: "username", message: "Username válido" };
  }

  return {
    valid: false,
    type: "invalid",
    message: "Use email, @username ou telefone (10+ dígitos)",
  };
}

/**
 * Buscar admin por qualquer identificador (para UI)
 */
export async function searchAdminByIdentifier(
  identifier: string
): Promise<{ uid: string; name: string; username: string; email: string } | null> {
  try {
    const id_lower = identifier.toLowerCase().trim();

    // Buscar por email
    let admins = await getDocs(
      query(collection(db, "admins"), where("email", "==", id_lower))
    );

    if (!admins.empty) {
      const data = admins.docs[0].data();
      return {
        uid: admins.docs[0].id,
        name: data.name,
        username: data.username,
        email: data.email,
      };
    }

    // Buscar por username
    admins = await getDocs(
      query(collection(db, "admins"), where("username", "==", id_lower.replace(/^@/, "")))
    );

    if (!admins.empty) {
      const data = admins.docs[0].data();
      return {
        uid: admins.docs[0].id,
        name: data.name,
        username: data.username,
        email: data.email,
      };
    }

    // Buscar por telefone
    admins = await getDocs(
      query(collection(db, "admins"), where("phone", "==", identifier))
    );

    if (!admins.empty) {
      const data = admins.docs[0].data();
      return {
        uid: admins.docs[0].id,
        name: data.name,
        username: data.username,
        email: data.email,
      };
    }

    return null;
  } catch (error) {
    console.error("[Admin Auth] Erro ao buscar admin:", error);
    return null;
  }
}
