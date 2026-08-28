/**
 * Accounts Page
 * 
 * Manage user accounts (bank accounts, cash, investments, etc.)
 */
import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Plus, Pencil, Lock, AlertCircle, Building2, CreditCard } from "lucide-react";
import { accountService } from "../services/accountService";
import {
  Account,
  AccountCreate,
  AccountType,
  ACCOUNT_TYPE_LABELS,
} from "../types/account";
import { BankLogo } from "@/components/BankLogo";
import { BankLogoPicker } from "@/components/BankLogoPicker";
import { AccountsSkeleton } from "@/components/skeletons/AccountsSkeleton";
import { useFeedback } from "@/context/FeedbackContext";
import "../styles/Accounts.css";

type Page =
  | 'dashboard'
  | 'timeline'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface AccountsPageProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function AccountsPage({ navigate, onLogout }: AccountsPageProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const { showFeedback } = useFeedback();

  // Form state
  const [formData, setFormData] = useState<AccountCreate>({
    name: "",
    type: AccountType.CHECKING,
    initial_balance: 0,
    currency: "EUR",
    logo_url: null,
  });

  useEffect(() => {
    loadAccounts();
  }, [showInactive]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAccounts(showInactive);
      setAccounts(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des comptes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance,
        currency: account.currency,
        logo_url: account.logo_url || null,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: "",
        type: AccountType.CHECKING,
        initial_balance: 0,
        currency: "EUR",
        logo_url: null,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      name: "",
      type: AccountType.CHECKING,
      initial_balance: 0,
      currency: "EUR",
      logo_url: null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingAccount) {
        await accountService.updateAccount(editingAccount.id, formData);
        showFeedback({
          title: "Compte mis à jour",
          message: `Le compte "${formData.name}" a été modifié avec succès.`,
          type: "success",
        });
      } else {
        await accountService.createAccount(formData);
        showFeedback({
          title: "Compte créé",
          message: `Le compte "${formData.name}" a été ajouté avec succès.`,
          type: "success",
        });
      }
      await loadAccounts();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous fermer ce compte ?\n\nLe compte sera désactivé mais l'historique des transactions sera conservé.")) {
      return;
    }

    try {
      await accountService.deleteAccount(id);
      showFeedback({
        title: "Compte fermé",
        message: "Le compte a été désactivé.",
        type: "delete",
      });
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la fermeture du compte");
    }
  };

  const totalBalance = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((sum, account) => {
      if (account.is_active) {
        return sum + Number(account.current_balance);
      }
      return sum;
    }, 0);
  }, [accounts]);

  if (loading) {
    return (
      <Layout currentPage="accounts" navigate={navigate} onLogout={onLogout}>
        <AccountsSkeleton />
      </Layout>
    );
  }

  return (
    <Layout currentPage="accounts" navigate={navigate} onLogout={onLogout}>
      <div className="accounts-page">
        <div className="accounts-header">
          <div>
            <h1>Mes Comptes Bancaires</h1>
            <p className="text-sm text-slate-500 mt-1">Gérez vos comptes, logos de banques et soldes</p>
          </div>
          <div className="header-actions">
            <label className="toggle-inactive">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span>Afficher les comptes fermés</span>
            </label>
            <button className="btn btn-primary flex items-center gap-1.5" onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4" />
              <span>Ajouter un compte</span>
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="accounts-summary">
          <div className="summary-card">
            <h3>Solde Global Réel</h3>
            <p className="total-amount">
              {totalBalance.toFixed(2)} €
            </p>
            <span className="summary-label">{accounts.filter(a => a.is_active).length} compte(s) actif(s)</span>
          </div>
        </div>

        <div className="accounts-grid">
          {accounts.length === 0 ? (
            <div className="empty-state">
              <p>Aucun compte trouvé</p>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                Créer votre premier compte
              </button>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className={`account-card ${!account.is_active ? "inactive" : ""}`}
              >
                <div className="account-header">
                  <BankLogo
                    accountName={account.name}
                    logoUrl={account.logo_url}
                    size="lg"
                  />
                  <div className="account-info">
                    <h3>{account.name}</h3>
                    <span className="account-type">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </span>
                  </div>
                </div>

                <div className="account-balance">
                  <span className="balance-amount">
                    {Number(account.current_balance).toFixed(2)} {account.currency}
                  </span>
                  {!account.is_active && account.closed_at && (
                    <span className="inactive-badge">
                      Fermé le {new Date(account.closed_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {!account.is_active && !account.closed_at && (
                    <span className="inactive-badge">Inactif</span>
                  )}
                </div>

                <div className="account-actions">
                  {account.is_active ? (
                    <>
                      <button
                        className="btn btn-secondary flex items-center justify-center gap-1.5"
                        onClick={() => handleOpenModal(account)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(account.id)}
                      >
                        Fermer
                      </button>
                    </>
                  ) : (
                    <span className="closed-label">Compte fermé</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal sm:max-w-[540px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {editingAccount ? "Modifier le compte" : "Nouveau compte"}
                </h2>
                <button className="close-btn" onClick={handleCloseModal}>
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bank Logo Picker */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <BankLogoPicker
                    value={formData.logo_url}
                    accountName={formData.name}
                    onChange={(logoUrl) => setFormData({ ...formData, logo_url: logoUrl })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">Nom du compte *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    placeholder="Ex: SG, BNP, BoursoBank..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="type">Type de compte *</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as AccountType,
                      })
                    }
                    required
                  >
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="initial_balance">
                    {editingAccount ? "Solde initial / de départ (€)" : "Solde initial (€)"}
                  </label>
                  <input
                    type="number"
                    id="initial_balance"
                    value={formData.initial_balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initial_balance: parseFloat(e.target.value) || 0,
                      })
                    }
                    step="0.01"
                  />
                  <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                    {editingAccount
                      ? `Solde actuel calculé : ${Number(editingAccount.current_balance).toFixed(2)} ${editingAccount.currency}. Ajuster le solde de départ recalibre votre solde actuel.`
                      : "Solde de départ de votre compte avant les transactions enregistrées."}
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Devise</label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingAccount ? "Enregistrer les modifications" : "Créer le compte"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AccountsPage;
