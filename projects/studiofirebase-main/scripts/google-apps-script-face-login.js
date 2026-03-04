// ADICIONE ESTA FUNÇÃO AO SEU GOOGLE APPS SCRIPT

/**
 * Função para verificar login por Face ID
 * Busca na planilha por uma imagem correspondente e verifica se o usuário tem pagamento
 */
function verifyUserLogin(imageBase64) {
  try {
  
    
    const sheet = getOrCreateActiveSheet();
    if (!sheet) {
      return { 
        success: false, 
        message: "Planilha de usuários não encontrada.", 
        isVip: false 
      };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { 
        success: false, 
        message: "Nenhum usuário cadastrado.", 
        isVip: false 
      };
    }
    
    const headers = data.shift();
    const emailColIndex = headers.indexOf("Email");
    const imageColIndex = headers.indexOf("Imagem ID (Base64)");
    const paymentIdColIndex = headers.indexOf("ID de Pagamento");
    const nomeColIndex = headers.indexOf("Nome");
    
    if (emailColIndex === -1 || imageColIndex === -1) {
      return { 
        success: false, 
        message: "Colunas necessárias não encontradas na planilha.", 
        isVip: false 
      };
    }
    
    // Buscar por correspondência de imagem (comparação simples dos primeiros caracteres)
    const imageToCompare = imageBase64.substring(0, 100); // Primeiros 100 caracteres para comparação
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const storedImage = row[imageColIndex];
      
      if (storedImage && storedImage.indexOf(imageToCompare) !== -1) {
        // Usuário encontrado
        const userName = row[nomeColIndex];
        const userEmail = row[emailColIndex];
        const hasPayment = paymentIdColIndex !== -1 && row[paymentIdColIndex] && row[paymentIdColIndex] !== "";
        
  
        
        return {
          success: true,
          message: `Bem-vindo, ${userName}!`,
          isVip: hasPayment,
          redirectUrl: hasPayment ? VIP_URL : "/dashboard",
          userEmail: userEmail
        };
      }
    }
    
    // Nenhum usuário encontrado

    return {
      success: false,
      message: "Rosto não reconhecido. Verifique se você está cadastrado.",
      isVip: false
    };
    
  } catch (error) {

    return {
      success: false,
      message: "Erro interno do servidor: " + error.message,
      isVip: false
    };
  }
}

/**
 * Atualizar a função doPost para suportar login
 */
function doPost(e) {
  let result;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      result = { success: false, message: "Solicitação POST inválida ou sem conteúdo." };
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    const payload = JSON.parse(e.postData.contents);
    
    // Verificar se é uma requisição de login
    if (e.parameter && e.parameter.page === 'login') {
    
      result = verifyUserLogin(payload.image);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Verificar se é uma requisição de verificação de pagamento
    if (e.parameter && e.parameter.action === 'checkPayment') {
      
      result = checkPaymentStatus(payload.email);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Processar cadastro (código existente)
    const { nome, email, telefone, image, video, firebaseUid } = payload;
    
    if (!nome || !email || !telefone || !image) {
      result = { success: false, message: "Dados obrigatórios ausentes (nome, email, telefone, image)." };
    } else {
      // Verificar se usuário já existe
      const existingCheck = checkExistingUser(payload);
      if (!existingCheck.success) {
        result = existingCheck;
      } else {
        // Registrar usuário
        result = registerUser(payload);
      }
    }
  } catch (error) {
    result = { success: false, message: "Ocorreu um erro no servidor: " + error.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Função para verificar se é uma requisição GET de login
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.page === 'login') {
    return createLoginPage();
  }
  return createRegisterPage();
}
