'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Edit2, Trash2, Tag, BookOpen, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { applyContentItemEdit } from './content-item-utils';

interface ContentItem {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  order_index: number;
  status: boolean;
  created_at?: any;
}

interface Topic {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  tags?: string[];
  reading_time?: number;
  featured?: boolean;
  status: boolean;
  author_id?: string;
  created_at?: any;
  updated_at?: any;
}

const CONTENT_CATEGORIES = [
  { value: 'fetish-bdsm', label: 'Fetish & BDSM' },
  { value: 'dominacao-submissao', label: 'Dominação e Submissão' },
  { value: 'sadomasoquismo', label: 'Sadomasoquismo' },
  { value: 'sexual-health', label: 'Saúde Sexual' },
  { value: 'other', label: 'Outros' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Content Tab ────────────────────────────────────────────────────────────

function ContentTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: '', category: 'fetish-bdsm', content: '' });

  useEffect(() => { loadContent(); }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, 'content'), orderBy('category'), orderBy('title'));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));
    } catch (err) {
      console.error('Error loading content:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar conteúdo', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = newItem.title.trim();
    const trimmedContent = newItem.content.trim();
    if (!trimmedTitle) { toast({ variant: 'destructive', title: 'Título obrigatório' }); return; }
    if (!trimmedContent) { toast({ variant: 'destructive', title: 'Conteúdo obrigatório' }); return; }
    const currentUser = auth.currentUser;
    if (!currentUser) { toast({ variant: 'destructive', title: 'Não autenticado' }); return; }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'content', editingId), { title: trimmedTitle, category: newItem.category, content: trimmedContent, updatedAt: serverTimestamp(), updatedBy: currentUser.uid });
        setItems(applyContentItemEdit(items, editingId, { title: trimmedTitle, category: newItem.category, content: trimmedContent }));
        toast({ title: 'Conteúdo atualizado', description: `"${trimmedTitle}" atualizado com sucesso` });
      } else {
        const existing = items.find(i => i.title.toLowerCase() === trimmedTitle.toLowerCase());
        if (existing) {
          await updateDoc(doc(db, 'content', existing.id), { content: trimmedContent, updatedAt: serverTimestamp(), updatedBy: currentUser.uid });
          setItems(items.map(i => i.id === existing.id ? { ...i, content: trimmedContent } : i));
          toast({ title: 'Conteúdo atualizado', description: `"${trimmedTitle}" atualizado com sucesso` });
        } else {
          const ref = await addDoc(collection(db, 'content'), { title: trimmedTitle, category: newItem.category, content: trimmedContent, createdAt: serverTimestamp(), createdBy: currentUser.uid });
          setItems([...items, { id: ref.id, title: trimmedTitle, category: newItem.category, content: trimmedContent }]);
          toast({ title: 'Conteúdo adicionado', description: `"${trimmedTitle}" criado com sucesso` });
        }
      }
      setNewItem({ title: '', category: 'fetish-bdsm', content: '' });
      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este conteúdo?')) return;
    try {
      await deleteDoc(doc(db, 'content', id));
      setItems(items.filter(i => i.id !== id));
      toast({ title: 'Conteúdo deletado' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao deletar', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-6 w-6 animate-spin" /><span>Carregando...</span></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isAdding && <Button onClick={() => setIsAdding(true)} className="gap-2"><Plus className="h-4 w-4" />Novo Conteúdo</Button>}
      </div>
      {isAdding && (
        <Card className="p-6 border-primary/30 bg-card/50">
          <div className="space-y-4">
            <div><label className="text-sm font-semibold">Título</label><Input placeholder="Título..." value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} className="mt-1" /></div>
            <div>
              <label className="text-sm font-semibold">Categoria</label>
              <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-foreground">
                {CONTENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-semibold">Conteúdo</label><Textarea placeholder="Escreva o conteúdo aqui..." value={newItem.content} onChange={e => setNewItem({ ...newItem, content: e.target.value })} rows={6} className="mt-1" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); setNewItem({ title: '', category: 'fetish-bdsm', content: '' }); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? 'Atualizar' : 'Adicionar'}</Button>
            </div>
          </div>
        </Card>
      )}
      <div className="grid gap-4">
        {CONTENT_CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat.value);
          return (
            <div key={cat.value}>
              <h2 className="text-lg font-semibold text-primary mb-3">{cat.label}</h2>
              <div className="grid gap-3">
                {catItems.length > 0 ? catItems.map(item => (
                  <Card key={item.id} className="p-4 border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-foreground/70 mt-2 line-clamp-3">{item.content}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setNewItem({ title: item.title, category: item.category, content: item.content }); setEditingId(item.id); setIsAdding(true); }} className="text-primary hover:bg-primary/10"><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </Card>
                )) : <div className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-lg">Nenhum conteúdo adicionado nesta categoria</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────────────────

function CategoriesTab() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '', order_index: 0, status: true });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, 'categories'), orderBy('order_index'));
      const snapshot = await getDocs(q);
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (err) {
      console.error('Error loading categories:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar categorias', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { toast({ variant: 'destructive', title: 'Nome obrigatório' }); return; }
    const currentUser = auth.currentUser;
    if (!currentUser) { toast({ variant: 'destructive', title: 'Não autenticado' }); return; }
    const slug = form.slug.trim() || slugify(name);

    setIsSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), { name, slug, icon: form.icon.trim(), order_index: Number(form.order_index), status: form.status, updated_at: serverTimestamp() });
        setCategories(categories.map(c => c.id === editingId ? { ...c, name, slug, icon: form.icon.trim(), order_index: Number(form.order_index), status: form.status } : c));
        toast({ title: 'Categoria atualizada' });
      } else {
        const ref = await addDoc(collection(db, 'categories'), { name, slug, icon: form.icon.trim(), order_index: Number(form.order_index), status: form.status, created_at: serverTimestamp() });
        setCategories([...categories, { id: ref.id, name, slug, icon: form.icon.trim(), order_index: Number(form.order_index), status: form.status }]);
        toast({ title: 'Categoria criada' });
      }
      setForm({ name: '', slug: '', icon: '', order_index: 0, status: true });
      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta categoria?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(categories.filter(c => c.id !== id));
      toast({ title: 'Categoria deletada' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao deletar', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-6 w-6 animate-spin" /><span>Carregando...</span></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isAdding && <Button onClick={() => setIsAdding(true)} className="gap-2"><Plus className="h-4 w-4" />Nova Categoria</Button>}
      </div>
      {isAdding && (
        <Card className="p-6 border-primary/30 bg-card/50">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Nome</label>
                <Input placeholder="Ex: Saúde, Educação..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold">Slug</label>
                <Input placeholder="saude, educacao..." value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Ícone</label>
                <Input placeholder="heart, book, star..." value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold">Ordem</label>
                <Input type="number" min={0} value={form.order_index} onChange={e => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold">Ativo</label>
              <button type="button" onClick={() => setForm({ ...form, status: !form.status })} className="text-primary">
                {form.status ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
              </button>
              <span className="text-sm text-muted-foreground">{form.status ? 'Ativo' : 'Inativo'}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); setForm({ name: '', slug: '', icon: '', order_index: 0, status: true }); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </div>
        </Card>
      )}
      <div className="grid gap-3">
        {categories.length === 0 && !isAdding ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma categoria criada ainda</p>
            <Button onClick={() => setIsAdding(true)} className="gap-2"><Plus className="h-4 w-4" />Criar Primeira Categoria</Button>
          </Card>
        ) : categories.map(cat => (
          <Card key={cat.id} className="p-4 border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">{cat.order_index}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{cat.name}</h3>
                    {!cat.status && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Inativo</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">slug: {cat.slug}{cat.icon ? ` · ícone: ${cat.icon}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '', order_index: cat.order_index, status: cat.status }); setEditingId(cat.id); setIsAdding(true); }} className="text-primary hover:bg-primary/10"><Edit2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Topics Tab ──────────────────────────────────────────────────────────────

function TopicsTab() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ category_id: '', title: '', slug: '', summary: '', content: '', tags: '', reading_time: 3, featured: false, status: true });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [topicsSnap, catsSnap] = await Promise.all([
        getDocs(query(collection(db, 'topics'), orderBy('category_id'), orderBy('title'))),
        getDocs(query(collection(db, 'categories'), orderBy('order_index'))),
      ]);
      setTopics(topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Topic)));
      setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (err) {
      console.error('Error loading topics:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar tópicos', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title) { toast({ variant: 'destructive', title: 'Título obrigatório' }); return; }
    if (!content) { toast({ variant: 'destructive', title: 'Conteúdo obrigatório' }); return; }
    if (!form.category_id) { toast({ variant: 'destructive', title: 'Categoria obrigatória' }); return; }
    const currentUser = auth.currentUser;
    if (!currentUser) { toast({ variant: 'destructive', title: 'Não autenticado' }); return; }
    const slug = form.slug.trim() || slugify(title);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    setIsSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'topics', editingId), { category_id: form.category_id, title, slug, summary: form.summary.trim(), content, tags, reading_time: Number(form.reading_time), featured: form.featured, status: form.status, updated_at: serverTimestamp() });
        setTopics(topics.map(t => t.id === editingId ? { ...t, category_id: form.category_id, title, slug, summary: form.summary.trim(), content, tags, reading_time: Number(form.reading_time), featured: form.featured, status: form.status } : t));
        toast({ title: 'Tópico atualizado' });
      } else {
        const ref = await addDoc(collection(db, 'topics'), { category_id: form.category_id, title, slug, summary: form.summary.trim(), content, tags, reading_time: Number(form.reading_time), featured: form.featured, status: form.status, author_id: currentUser.uid, created_at: serverTimestamp(), updated_at: serverTimestamp() });
        setTopics([...topics, { id: ref.id, category_id: form.category_id, title, slug, summary: form.summary.trim(), content, tags, reading_time: Number(form.reading_time), featured: form.featured, status: form.status, author_id: currentUser.uid }]);
        toast({ title: 'Tópico criado' });
      }
      setForm({ category_id: '', title: '', slug: '', summary: '', content: '', tags: '', reading_time: 3, featured: false, status: true });
      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este tópico?')) return;
    try {
      await deleteDoc(doc(db, 'topics', id));
      setTopics(topics.filter(t => t.id !== id));
      toast({ title: 'Tópico deletado' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao deletar', description: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  if (isLoading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-6 w-6 animate-spin" /><span>Carregando...</span></div>;

  const groupedTopics = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    const key = t.category_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isAdding && <Button onClick={() => setIsAdding(true)} className="gap-2"><Plus className="h-4 w-4" />Novo Tópico</Button>}
      </div>
      {isAdding && (
        <Card className="p-6 border-primary/30 bg-card/50">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Categoria</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-foreground">
                <option value="">Selecione uma categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Título</label>
                <Input placeholder="Título do tópico..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold">Slug</label>
                <Input placeholder="titulo-do-topico" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Resumo</label>
              <Input placeholder="Breve descrição do tópico..." value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold">Conteúdo</label>
              <Textarea placeholder="Conteúdo completo do tópico..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Tags (separadas por vírgula)</label>
                <Input placeholder="tag1, tag2, tag3" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold">Tempo de leitura (min)</label>
                <Input type="number" min={1} value={form.reading_time} onChange={e => setForm({ ...form, reading_time: parseInt(e.target.value) || 3 })} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Ativo</label>
                <button type="button" onClick={() => setForm({ ...form, status: !form.status })} className="text-primary">
                  {form.status ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                </button>
                <span className="text-sm text-muted-foreground">{form.status ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Destaque</label>
                <button type="button" onClick={() => setForm({ ...form, featured: !form.featured })} className="text-primary">
                  {form.featured ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                </button>
                <span className="text-sm text-muted-foreground">{form.featured ? 'Sim' : 'Não'}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); setForm({ category_id: '', title: '', slug: '', summary: '', content: '', tags: '', reading_time: 3, featured: false, status: true }); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? 'Atualizar' : 'Criar'}</Button>
            </div>
          </div>
        </Card>
      )}
      <div className="grid gap-6">
        {Object.keys(groupedTopics).length === 0 && !isAdding ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum tópico criado ainda</p>
            <Button onClick={() => setIsAdding(true)} className="gap-2"><Plus className="h-4 w-4" />Criar Primeiro Tópico</Button>
          </Card>
        ) : Object.entries(groupedTopics).map(([catId, catTopics]) => (
          <div key={catId}>
            <h2 className="text-lg font-semibold text-primary mb-3">{getCategoryName(catId)}</h2>
            <div className="grid gap-3">
              {catTopics.map(topic => (
                <Card key={topic.id} className="p-4 border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{topic.title}</h3>
                        {topic.featured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Destaque</span>}
                        {!topic.status && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inativo</span>}
                        {topic.reading_time && <span className="text-xs text-muted-foreground">{topic.reading_time} min</span>}
                      </div>
                      {topic.summary && <p className="text-sm text-muted-foreground mt-1">{topic.summary}</p>}
                      <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{topic.content}</p>
                      {topic.tags && topic.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {topic.tags.map(tag => <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setForm({ category_id: topic.category_id, title: topic.title, slug: topic.slug, summary: topic.summary || '', content: topic.content, tags: (topic.tags || []).join(', '), reading_time: topic.reading_time || 3, featured: topic.featured || false, status: topic.status });
                        setEditingId(topic.id);
                        setIsAdding(true);
                      }} className="text-primary hover:bg-primary/10"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(topic.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminConteudoPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm">
        <h1 className="text-3xl font-bold tracking-tight text-white">Gerenciar Conteúdo</h1>
        <p className="text-white/60 mt-1">Gerencie categorias, tópicos e conteúdo exibidos na plataforma</p>
      </div>

      <Tabs defaultValue="categorias">
        <TabsList className="mb-4">
          <TabsTrigger value="categorias" className="gap-2"><Tag className="h-4 w-4" />Categorias</TabsTrigger>
          <TabsTrigger value="topicos" className="gap-2"><BookOpen className="h-4 w-4" />Tópicos</TabsTrigger>
          <TabsTrigger value="conteudo" className="gap-2"><FileText className="h-4 w-4" />Conteúdo</TabsTrigger>
        </TabsList>
        <TabsContent value="categorias"><CategoriesTab /></TabsContent>
        <TabsContent value="topicos"><TopicsTab /></TabsContent>
        <TabsContent value="conteudo"><ContentTab /></TabsContent>
      </Tabs>
    </div>
  );
}
