'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TaggedUser {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
}

interface UserTaggingProps {
  onUsersChange: (users: TaggedUser[]) => void;
  currentUsers?: TaggedUser[];
}

export function UserTagging({ onUsersChange, currentUsers = [] }: UserTaggingProps) {
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>(currentUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaggedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUsers.length > 0) {
      setTaggedUsers(currentUsers);
    }
  }, [currentUsers]);

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Search in users collection by displayName or email
      const usersRef = collection(db, 'users');
      
      // Normalize search term for case-insensitive search
      const normalizedSearch = searchTerm.toLowerCase();
      
      // Search by display name (case-insensitive partial match)
      const nameQuery = query(
        usersRef,
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );

      const nameSnapshot = await getDocs(nameQuery);
      const results: TaggedUser[] = [];

      nameSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter client-side for case-insensitive match
        const displayName = (data.displayName || '').toLowerCase();
        if (displayName.includes(normalizedSearch) && !taggedUsers.find(u => u.uid === doc.id)) {
          results.push({
            uid: doc.id,
            displayName: data.displayName || data.email || 'Usuário',
            email: data.email,
            photoURL: data.photoURL,
          });
        }
      });

      // If search term looks like email, also search by email
      if (searchTerm.includes('@')) {
        const emailQuery = query(
          usersRef,
          where('email', '==', searchTerm.toLowerCase()),
          limit(5)
        );

        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.forEach((doc) => {
          const data = doc.data();
          if (!results.find(u => u.uid === doc.id) && !taggedUsers.find(u => u.uid === doc.id)) {
            results.push({
              uid: doc.id,
              displayName: data.displayName || data.email || 'Usuário',
              email: data.email,
              photoURL: data.photoURL,
            });
          }
        });
      }

      setSearchResults(results);

      if (results.length === 0) {
        toast({
          title: 'Nenhum usuário encontrado',
          description: 'Tente outro termo de busca',
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na busca',
        description: 'Não foi possível buscar usuários',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addUser = (user: TaggedUser) => {
    if (taggedUsers.find(u => u.uid === user.uid)) {
      toast({
        title: 'Usuário já marcado',
        description: `${user.displayName} já está marcado nesta atualização`,
      });
      return;
    }

    const updatedUsers = [...taggedUsers, user];
    setTaggedUsers(updatedUsers);
    onUsersChange(updatedUsers);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);

    toast({
      title: 'Usuário marcado!',
      description: `${user.displayName} foi marcado`,
    });
  };

  const removeUser = (uid: string) => {
    const updatedUsers = taggedUsers.filter(u => u.uid !== uid);
    setTaggedUsers(updatedUsers);
    onUsersChange(updatedUsers);
  };

  return (
    <div className="space-y-3">
      {/* Tagged Users Display */}
      {taggedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {taggedUsers.map((user) => (
            <div
              key={user.uid}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-full"
            >
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="text-sm font-medium text-blue-900">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={() => removeUser(user.uid)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Interface */}
      {!showSearch ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSearch(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Marcar Usuários
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              Cancelar
            </Button>
          </div>

          {/* Search Results */}
          {isSearching && (
            <div className="p-3 text-center text-sm text-gray-500">
              Buscando...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => addUser(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{user.displayName}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500">{user.email}</p>
                    )}
                  </div>
                  <UserPlus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Marque usuários que você deseja mencionar nesta atualização
      </p>
    </div>
  );
}
