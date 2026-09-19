import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Compass,
  Trash2,
  Copy,
  Edit2,
  Pencil,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  CreditCard,
  ArrowRight,
  TrendingDown,
  X,
  Layers,
  Plane,
  Home,
  Car,
  ShoppingBag,
  PartyPopper,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { projectService } from '@/services/projectService';
import { accountService } from '@/services/accountService';
import { categoryService } from '@/services/categoryService';
import {
  Project,
  ProjectDetail,
  ProjectItem,
  ProjectSimulation,
} from '@/types/project';
import { Account } from '@/types/account';
import { Category } from '@/types/category';
import { ProjectWhatIfChart } from '@/components/ProjectWhatIfChart';

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'projects'
  | 'settings'
  | 'settings-profile'
  | 'settings-household'
  | 'settings-invitations'
  | 'trash'
  | 'notifications';

interface ProjectsPageProps {
  navigate: (page: Page) => void;
  onLogout: () => void;
}

const PROJECT_ICONS = [
  { name: 'Compass', icon: Compass, label: 'Général' },
  { name: 'Plane', icon: Plane, label: 'Voyage / Vacances' },
  { name: 'Home', icon: Home, label: 'Maison / Travaux' },
  { name: 'Car', icon: Car, label: 'Auto / Mobilité' },
  { name: 'PartyPopper', icon: PartyPopper, label: 'Événement / Fête' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'Achats' },
];

const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Bleu
  '#10b981', // Émeraude
  '#f59e0b', // Ambre
  '#ec4899', // Rose
  '#8b5cf6', // Violet
];

const renderProjectIcon = (iconName?: string, className = "w-5 h-5") => {
  switch (iconName) {
    case 'Plane': return <Plane className={className} />;
    case 'Home': return <Home className={className} />;
    case 'Car': return <Car className={className} />;
    case 'PartyPopper': return <PartyPopper className={className} />;
    case 'ShoppingBag': return <ShoppingBag className={className} />;
    default: return <Compass className={className} />;
  }
};

const PROJECT_TEMPLATES = [
  {
    title: '🏖️ Vacances / Voyage',
    name: 'Voyage en Grèce 2026',
    description: 'Vol, hébergement, réservations et extras sur place',
    budget: '2500',
    color: '#3b82f6',
    icon: 'Plane',
    items: [
      { name: "Billets d'avion A/R", amount: 550, daysOffset: 15 },
      { name: 'Réservation Hébergement', amount: 950, daysOffset: 45 },
      { name: 'Activités & Excursions', amount: 300, daysOffset: 60 },
      { name: 'Restauration & Extras', amount: 400, daysOffset: 70 },
    ],
  },
  {
    title: '🏡 Travaux & Déco',
    name: 'Rénovation Salon & Cuisine',
    description: 'Matériaux, artisanat et aménagement intérieur',
    budget: '3200',
    color: '#10b981',
    icon: 'Home',
    items: [
      { name: 'Peinture & Matériaux', amount: 650, daysOffset: 10 },
      { name: 'Main d’œuvre / Artisan', amount: 1600, daysOffset: 25 },
      { name: 'Mobilier & Décoration', amount: 950, daysOffset: 40 },
    ],
  },
  {
    title: '📦 Déménagement',
    name: 'Déménagement Appartement',
    description: 'Caution, logistique et aménagement',
    budget: '1700',
    color: '#f59e0b',
    icon: 'Car',
    items: [
      { name: 'Caution nouveau logement', amount: 1100, daysOffset: 10 },
      { name: 'Location utilitaire', amount: 350, daysOffset: 20 },
      { name: 'Cartons & Fournitures', amount: 150, daysOffset: 5 },
    ],
  },
  {
    title: '🎉 Événement / Fête',
    name: 'Organisation Soirée / Fête',
    description: 'Lieu, traiteur et animations',
    budget: '1500',
    color: '#ec4899',
    icon: 'PartyPopper',
    items: [
      { name: 'Acompte Salle / Espace', amount: 600, daysOffset: 15 },
      { name: 'Traiteur & Boissons', amount: 700, daysOffset: 45 },
      { name: 'Décoration & Musique', amount: 200, daysOffset: 40 },
    ],
  },
];

export function ProjectsPage({ navigate, onLogout }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Projet (Création & Modification)
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | ProjectDetail | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');
  const [projectIcon, setProjectIcon] = useState('Compass');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [templateItems, setTemplateItems] = useState<any[]>([]);

  // Modal / Vue Détail Projet
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [simulation, setSimulation] = useState<ProjectSimulation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'simulation'>('expenses');

  // Modal Dépense (Ajout ou Modification)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [itemAccountId, setItemAccountId] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Action feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [projs, accs, cats] = await Promise.all([
        projectService.getProjects(),
        accountService.getAccounts(),
        categoryService.getCategories(),
      ]);
      setProjects(projs);
      setAccounts(accs.filter((a) => a.is_active));
      setCategories(cats);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const [detail, sim] = await Promise.all([
        projectService.getProject(id),
        projectService.simulate(id),
      ]);
      setProjectDetail(detail);
      setSimulation(sim);
      setSelectedProjectId(id);
    } catch (err) {
      console.error('Erreur détail projet:', err);
      setFeedback({ type: 'error', message: 'Impossible de charger le projet.' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const applyTemplate = (tpl: typeof PROJECT_TEMPLATES[0]) => {
    setProjectName(tpl.name);
    setProjectDesc(tpl.description);
    setProjectBudget(tpl.budget);
    setProjectColor(tpl.color);
    setProjectIcon(tpl.icon);

    const defaultAccId = accounts[0]?.id || '';
    const now = new Date();
    const items = tpl.items.map((it) => {
      const d = new Date();
      d.setDate(now.getDate() + it.daysOffset);
      return {
        name: it.name,
        amount: it.amount,
        planned_date: d.toISOString().split('T')[0],
        account_id: defaultAccId,
      };
    });
    setTemplateItems(items);
  };

  const openCreateProjectModal = () => {
    setEditingProject(null);
    resetProjectForm();
    setShowProjectModal(true);
  };

  const openEditProjectModal = (proj: Project | ProjectDetail) => {
    setEditingProject(proj);
    setProjectName(proj.name || '');
    setProjectDesc(proj.description || '');
    setProjectBudget(proj.total_budget ? String(proj.total_budget) : '');
    setProjectColor(proj.color || '#6366f1');
    setProjectIcon(proj.icon || 'Compass');
    setProjectStartDate(proj.target_start_date || '');
    setProjectEndDate(proj.target_end_date || '');
    setTemplateItems([]);
    setShowProjectModal(true);
  };

  const resetProjectForm = () => {
    setProjectName('');
    setProjectDesc('');
    setProjectBudget('');
    setProjectColor('#6366f1');
    setProjectIcon('Compass');
    setProjectStartDate('');
    setProjectEndDate('');
    setTemplateItems([]);
    setEditingProject(null);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      if (editingProject) {
        const updated = await projectService.updateProject(editingProject.id, {
          name: projectName.trim(),
          description: projectDesc.trim() || undefined,
          total_budget: projectBudget ? parseFloat(projectBudget) : undefined,
          color: projectColor,
          icon: projectIcon,
          target_start_date: projectStartDate || undefined,
          target_end_date: projectEndDate || undefined,
        });
        setShowProjectModal(false);
        resetProjectForm();
        await loadInitialData();
        if (selectedProjectId === editingProject.id) {
          loadProjectDetail(editingProject.id);
        }
        setFeedback({ type: 'success', message: `Projet "${updated.name}" mis à jour avec succès !` });
      } else {
        const created = await projectService.createProject({
          name: projectName.trim(),
          description: projectDesc.trim() || undefined,
          total_budget: projectBudget ? parseFloat(projectBudget) : undefined,
          color: projectColor,
          icon: projectIcon,
          target_start_date: projectStartDate || undefined,
          target_end_date: projectEndDate || undefined,
          items: templateItems.length > 0 ? templateItems : undefined,
        });
        setShowProjectModal(false);
        resetProjectForm();
        await loadInitialData();
        loadProjectDetail(created.id);
        setFeedback({ type: 'success', message: `Projet "${created.name}" créé avec succès !` });
      }
    } catch (err) {
      console.error('Erreur sauvegarde projet:', err);
      setFeedback({ type: 'error', message: 'Erreur lors de la sauvegarde du projet.' });
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le projet "${name}" ?`)) return;
    try {
      await projectService.deleteProject(id);
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
        setProjectDetail(null);
      }
      await loadInitialData();
      setFeedback({ type: 'success', message: `Projet "${name}" supprimé.` });
    } catch (err) {
      console.error('Erreur suppression projet:', err);
      setFeedback({ type: 'error', message: 'Erreur lors de la suppression.' });
    }
  };

  const handleDuplicateProject = async (id: string, name: string) => {
    try {
      const duplicated = await projectService.duplicateProject(id);
      await loadInitialData();
      setSelectedProjectId(duplicated.id);
      setProjectDetail(duplicated);
      setFeedback({ type: 'success', message: `Projet "${name}" dupliqué avec succès !` });
    } catch (err) {
      console.error('Erreur duplication projet:', err);
      setFeedback({ type: 'error', message: 'Erreur lors de la duplication du projet.' });
    }
  };

  const openCreateItemModal = () => {
    setEditingItem(null);
    resetItemForm();
    setShowItemModal(true);
  };

  const openEditItemModal = (item: ProjectItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemAmount(String(item.amount));
    setItemDate(item.planned_date);
    setItemAccountId(item.account_id);
    setItemCategoryId(item.category_id || '');
    setItemNotes(item.notes || '');
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !itemName.trim() || !itemAmount || !itemAccountId || !itemDate) return;

    try {
      if (editingItem) {
        await projectService.updateItem(selectedProjectId, editingItem.id, {
          name: itemName.trim(),
          amount: parseFloat(itemAmount),
          planned_date: itemDate,
          account_id: itemAccountId,
          category_id: itemCategoryId || undefined,
          notes: itemNotes.trim() || undefined,
        });
        setFeedback({ type: 'success', message: 'Dépense modifiée et simulation recalculée !' });
      } else {
        await projectService.addItem(selectedProjectId, {
          name: itemName.trim(),
          amount: parseFloat(itemAmount),
          planned_date: itemDate,
          account_id: itemAccountId,
          category_id: itemCategoryId || undefined,
          notes: itemNotes.trim() || undefined,
        });
        setFeedback({ type: 'success', message: 'Dépense ajoutée et simulation recalculée !' });
      }

      setShowItemModal(false);
      setEditingItem(null);
      resetItemForm();
      await loadProjectDetail(selectedProjectId);
      await loadInitialData();
    } catch (err) {
      console.error('Erreur sauvegarde dépense:', err);
      setFeedback({
        type: 'error',
        message: editingItem
          ? 'Erreur lors de la modification de la dépense.'
          : "Erreur lors de l'ajout de la dépense.",
      });
    }
  };

  const resetItemForm = () => {
    setItemName('');
    setItemAmount('');
    setItemDate(new Date().toISOString().split('T')[0]);
    setItemAccountId(accounts[0]?.id || '');
    setItemCategoryId('');
    setItemNotes('');
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedProjectId) return;
    try {
      await projectService.deleteItem(selectedProjectId, itemId);
      await loadProjectDetail(selectedProjectId);
      await loadInitialData();
      setFeedback({ type: 'success', message: 'Dépense retirée du projet.' });
    } catch (err) {
      console.error('Erreur suppression dépense:', err);
    }
  };

  const handleCommitProject = async () => {
    if (!selectedProjectId || !projectDetail) return;
    if (
      !window.confirm(
        `Confirmez-vous la validation du projet "${projectDetail.name}" ? Ses dépenses seront injectées dans votre timeline officielle.`
      )
    ) {
      return;
    }

    try {
      const res = await projectService.commit(selectedProjectId);
      await loadProjectDetail(selectedProjectId);
      await loadInitialData();
      setFeedback({ type: 'success', message: res.message });
    } catch (err) {
      console.error('Erreur commit:', err);
      setFeedback({ type: 'error', message: 'Erreur lors de la validation du projet.' });
    }
  };

  const handleRollbackProject = async () => {
    if (!selectedProjectId || !projectDetail) return;
    if (
      !window.confirm(
        `Voulez-vous repasser le projet "${projectDetail.name}" en simulation ? Les transactions projetées non réalisées seront retirées de la timeline.`
      )
    ) {
      return;
    }

    try {
      const res = await projectService.rollback(selectedProjectId);
      await loadProjectDetail(selectedProjectId);
      await loadInitialData();
      setFeedback({ type: 'success', message: res.message });
    } catch (err) {
      console.error('Erreur rollback:', err);
      setFeedback({ type: 'error', message: "Erreur lors de l'annulation." });
    }
  };

  const formatEuro = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <Layout currentPage="projects" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Compass className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Projets & Simulations "What-If"
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Planifiez des enveloppes de dépenses (vacances, travaux, mariage...), simulez l'impact
              trésorerie compte par compte, et validez-les dans votre budget quand vous êtes prêt.
            </p>
          </div>

          <Button
            onClick={() => {
              resetProjectForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Projet</span>
          </Button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Grille des Projets */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed rounded-2xl bg-card space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Aucun projet en cours</h3>
              <p className="text-sm text-muted-foreground">
                Créez votre premier projet (ex: Vacances en Grèce, Achat d'une voiture, Travaux) pour
                simuler la faisabilité financière avant d'engager les dépenses.
              </p>
            </div>
            <Button
              onClick={openCreateProjectModal}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un projet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const isCommitted = proj.status === 'COMMITTED';
              return (
                <div
                  key={proj.id}
                  onClick={() => loadProjectDetail(proj.id)}
                  className={`group relative rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                    selectedProjectId === proj.id ? 'ring-2 ring-primary border-transparent' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: proj.color || '#6366f1' }}
                        >
                          {renderProjectIcon(proj.icon, "w-5 h-5")}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {proj.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                              isCommitted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            {isCommitted ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Validé & Actif
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" /> En simulation
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Menu 3-points (Modifier, Dupliquer, Supprimer) */}
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-all"
                              title="Options du projet"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => openEditProjectModal(proj)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4 text-primary" />
                              <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateProject(proj.id, proj.name)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4 text-sky-600" />
                              <span>Dupliquer</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteProject(proj.id, proj.name)}
                              className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Dépenses prévues :</span>
                      <span className="font-semibold text-foreground text-sm">
                        {formatEuro(proj.total_planned_amount || 0)}
                      </span>
                    </div>

                    {proj.total_budget && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Budget cible : {formatEuro(proj.total_budget)}</span>
                          <span>
                            {Math.min(
                              Math.round(
                                ((proj.total_planned_amount || 0) / proj.total_budget) * 100
                              ),
                              100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              backgroundColor: proj.color || '#6366f1',
                              width: `${Math.min(
                                ((proj.total_planned_amount || 0) / proj.total_budget) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span>{proj.items_count || 0} paiement(s)</span>
                      <span className="flex items-center gap-1 text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                        Simuler & Gérer <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal / Vue Détaillée du Projet Sélectionné */}
        {selectedProjectId && projectDetail && (
          <div className="rounded-2xl border bg-card p-6 shadow-md space-y-6 mt-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow"
                  style={{ backgroundColor: projectDetail.color || '#6366f1' }}
                >
                  {renderProjectIcon(projectDetail.icon, "w-6 h-6")}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-foreground">{projectDetail.name}</h2>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        projectDetail.status === 'COMMITTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}
                    >
                      {projectDetail.status === 'COMMITTED'
                        ? 'Validé & Actif'
                        : 'Simulation en cours'}
                    </span>
                  </div>
                  {projectDetail.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {projectDetail.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Validation / Rollback / 3-points */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {projectDetail.status === 'DRAFT' ? (
                  <Button
                    onClick={handleCommitProject}
                    disabled={projectDetail.items.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Valider le projet et intégrer
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleRollbackProject}
                    className="flex items-center gap-2 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repasser en simulation
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0" title="Options du projet">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => openEditProjectModal(projectDetail)}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4 text-primary" />
                      <span>Modifier</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateProject(projectDetail.id, projectDetail.name)}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4 text-sky-600" />
                      <span>Dupliquer</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteProject(projectDetail.id, projectDetail.name)}
                      className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  onClick={() => {
                    setSelectedProjectId(null);
                    setProjectDetail(null);
                  }}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-muted"
                  title="Fermer la vue"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Jauge Prévu vs Réalisé pour les projets validés */}
            {projectDetail.status === 'COMMITTED' && (() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const realizedItems = projectDetail.items.filter((it) => it.planned_date <= todayStr);
              const realizedTotal = realizedItems.reduce((sum, it) => sum + Number(it.amount), 0);
              const remainingTotal = Math.max(0, (projectDetail.total_planned_amount || 0) - realizedTotal);
              const progressPercent = projectDetail.total_planned_amount > 0
                ? Math.min(100, Math.round((realizedTotal / projectDetail.total_planned_amount) * 100))
                : 0;

              return (
                <div className="p-4 rounded-xl border bg-card/70 backdrop-blur-sm space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Suivi d'exécution : Prévu vs Réalisé
                    </span>
                    <span className="font-bold text-foreground font-mono-amounts">
                      {formatEuro(realizedTotal)} réglés sur {formatEuro(projectDetail.total_planned_amount)} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                      title={`Déjà payé : ${formatEuro(realizedTotal)}`}
                    />
                    <div
                      className="h-full bg-primary/30 transition-all"
                      style={{ width: `${100 - progressPercent}%` }}
                      title={`Reste à régler : ${formatEuro(remainingTotal)}`}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Déjà décaissé : {formatEuro(realizedTotal)} ({realizedItems.length} paiement{realizedItems.length > 1 ? 's' : ''})
                    </span>
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 inline-block" />
                      Reste à décaisser : {formatEuro(remainingTotal)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Onglets Dépenses / Simulation */}
            <div className="flex items-center gap-2 border-b">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'expenses'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Dépenses prévues ({projectDetail.items.length})
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'simulation'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Simulation What-If
                {simulation && !simulation.is_viable && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            </div>

            {/* Contenu Onglet 1 : Dépenses prévues */}
            {activeTab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Paiements comptants & réservations
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Chaque dépense est associée à son compte bancaire et à sa date prévue.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={openCreateItemModal}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une dépense
                  </Button>
                </div>

                {projectDetail.items.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-xl space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Aucune dépense enregistrée pour ce projet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateItemModal}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter la première dépense
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                        <tr>
                          <th className="py-3 px-4">Désignation</th>
                          <th className="py-3 px-4">Date prévue</th>
                          <th className="py-3 px-4">Compte débité</th>
                          <th className="py-3 px-4">Catégorie</th>
                          <th className="py-3 px-4 text-right">Montant</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectDetail.items.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">
                              {item.name}
                              {item.notes && (
                                <span className="block text-[11px] text-muted-foreground">
                                  {item.notes}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 opacity-60" />
                                {new Date(item.planned_date).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px]">
                                <CreditCard className="w-3 h-3 opacity-60" />
                                {item.account_name || 'Compte'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {item.category_name || '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-foreground text-sm">
                              {formatEuro(item.amount)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                                  title="Modifier la dépense"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors"
                                  title="Supprimer la dépense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t font-semibold">
                        <tr>
                          <td colSpan={4} className="py-3 px-4 text-foreground">
                            Total prévu
                          </td>
                          <td className="py-3 px-4 text-right text-foreground text-sm">
                            {formatEuro(projectDetail.total_planned_amount || 0)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Contenu Onglet 2 : Simulation What-If */}
            {activeTab === 'simulation' && simulation && (
              <div className="space-y-6">
                {/* Bandeau de Viabilité */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    simulation.is_viable
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {simulation.is_viable ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">
                      {simulation.is_viable
                        ? 'Projet 100% Viable Financièrement !'
                        : 'Alerte : Risque de découvert détecté'}
                    </h4>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {simulation.is_viable
                        ? 'Tous vos comptes restent dans le positif tout au long de la période. Vous pouvez valider ce projet en toute sérénité.'
                        : 'L’un de vos comptes risque de passer en négatif à une ou plusieurs dates lors du décaissement des dépenses de ce projet.'}
                    </p>

                    {/* Liste des warnings et suggestion d'ajustement */}
                    {simulation.warnings && simulation.warnings.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-rose-200/50 dark:border-rose-800/50 space-y-2">
                        <ul className="space-y-1 text-xs">
                          {simulation.warnings.map((w, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 font-medium">
                              <span>•</span> {w.message}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => {
                            setItemName(`Virement de secours vers ${simulation.critical_account_name || 'compte'}`);
                            setItemDate(simulation.critical_date || new Date().toISOString().split('T')[0]);
                            const savingsAcc = accounts.find((a) => a.type === 'SAVINGS') || accounts[0];
                            if (savingsAcc) setItemAccountId(savingsAcc.id);
                            setItemAmount('300');
                            setItemNotes(`Alimentation pour combler le découvert prévu le ${simulation.critical_date}`);
                            setShowItemModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 text-xs font-semibold hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Planifier un ajustement de trésorerie pour ce découvert</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* KPIs de Simulation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Coût total du projet</span>
                    <p className="text-lg font-bold text-foreground">
                      {formatEuro(simulation.total_cost)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Solde de référence (min)</span>
                    <p className="text-lg font-bold text-slate-600">
                      {formatEuro(simulation.projected_min_balance_baseline)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-xs text-muted-foreground">Solde avec projet (min)</span>
                    <p
                      className={`text-lg font-bold ${
                        simulation.projected_min_balance_whatif < 0
                          ? 'text-rose-600'
                          : 'text-indigo-600'
                      }`}
                    >
                      {formatEuro(simulation.projected_min_balance_whatif)}
                    </p>
                  </div>
                </div>

                {/* Graphique What-If Dédié */}
                <ProjectWhatIfChart
                  timeline={simulation.timeline}
                  projectName={projectDetail.name}
                />
              </div>
            )}
          </div>
        )}

        {/* Modal Création & Modification Projet */}
        {showProjectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-card border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-lg text-foreground">
                  {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
                </h3>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-4">
                {/* Modèles rapides (uniquement en création) */}
                {!editingProject && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Modèles prédéfinis (clic rapide)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROJECT_TEMPLATES.map((tpl) => (
                        <button
                          type="button"
                          key={tpl.name}
                          onClick={() => applyTemplate(tpl)}
                          className="p-2 rounded-xl border bg-muted/30 hover:bg-muted/60 text-left transition-all hover:scale-[1.02] text-xs space-y-0.5"
                        >
                          <span className="font-semibold text-foreground block">{tpl.title}</span>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {tpl.items.length} dépenses • {tpl.budget} €
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="proj-name">Nom du projet *</Label>
                  <Input
                    id="proj-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="ex: Vacances en Grèce 2026, Travaux Salon"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="proj-desc">Description (optionnel)</Label>
                  <Input
                    id="proj-desc"
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="ex: Vol + Hôtel + Activités d'été"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="proj-budget">Budget cible global (optionnel)</Label>
                  <Input
                    id="proj-budget"
                    type="number"
                    step="0.01"
                    value={projectBudget}
                    onChange={(e) => setProjectBudget(e.target.value)}
                    placeholder="ex: 2500"
                  />
                </div>

                {/* Dates prévisionnelles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="proj-start">Date de début (optionnel)</Label>
                    <Input
                      id="proj-start"
                      type="date"
                      value={projectStartDate}
                      onChange={(e) => setProjectStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="proj-end">Date de fin (optionnel)</Label>
                    <Input
                      id="proj-end"
                      type="date"
                      value={projectEndDate}
                      onChange={(e) => setProjectEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Couleur du badge */}
                <div className="space-y-1.5">
                  <Label>Couleur du badge</Label>
                  <div className="flex items-center gap-2">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setProjectColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          projectColor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icône du projet */}
                <div className="space-y-1.5">
                  <Label>Icône du projet</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {PROJECT_ICONS.map((item) => {
                      const isSelected = projectIcon === item.name;
                      return (
                        <button
                          type="button"
                          key={item.name}
                          onClick={() => setProjectIcon(item.name)}
                          className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          title={item.label}
                        >
                          {renderProjectIcon(item.name, "w-5 h-5")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProjectModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={!projectName.trim()}>
                    {editingProject ? 'Enregistrer les modifications' : 'Créer le projet'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Dépense (Ajout ou Modification) */}
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-lg text-foreground">
                  {editingItem ? 'Modifier la dépense prévisionnelle' : 'Ajouter une dépense prévisionnelle'}
                </h3>
                <button
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="item-name">Intitulé de la dépense *</Label>
                  <Input
                    id="item-name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="ex: Billets d'avion, Acompte hôtel"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="item-amount">Montant (€) *</Label>
                    <Input
                      id="item-amount"
                      type="number"
                      step="0.01"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                      placeholder="ex: 450"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-date">Date prévue *</Label>
                    <Input
                      id="item-date"
                      type="date"
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-account">Compte bancaire débité *</Label>
                  <select
                    id="item-account"
                    value={itemAccountId}
                    onChange={(e) => setItemAccountId(e.target.value)}
                    className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2"
                    required
                  >
                    <option value="">Sélectionner un compte</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-category">Catégorie (optionnel)</Label>
                  <select
                    id="item-category"
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2"
                  >
                    <option value="">Aucune catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-notes">Notes (optionnel)</Label>
                  <Input
                    id="item-notes"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="ex: Réservé sur Booking, paiement non remboursable"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={!itemName.trim() || !itemAmount || !itemAccountId || !itemDate}
                  >
                    {editingItem ? 'Enregistrer les modifications' : 'Ajouter et simuler'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
