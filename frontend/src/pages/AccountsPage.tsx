/**
 * Accounts Page
 * 
 * Manage user accounts (bank accounts, cash, investments, etc.)
 */
import React, { useState, useEffect } from "react";
import { accountService } from "../services/accountService";
import {
  Account,
  AccountCreate,
  AccountType,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ICONS,
} from "../types/account";
import "../styles/Accounts.css";

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [formData, setFormData] = useState<AccountCreate>({
    name: "",
    type: AccountType.CHECKING,
    initial_balance: 0,
    currency: "EUR",
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAccounts();
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
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: "",
        type: AccountType.CHECKING,
        initial_balance: 0,
        currency: "EUR",
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
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingAccount) {
        await accountService.updateAccount(editingAccount.id, formData);
      } else {
        await accountService.createAccount(formData);
      }
      await loadAccounts();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      return;
    }

    try {
      await accountService.deleteAccount(id);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const calculateTotalBalance = (): number => {
    if (!accounts || accounts.length === 0) return 0;
    return accounts.reduce((sum, account) => {
      if (account.is_active) {
        return sum + Number(account.current_balance);
      }
      return sum;
    }, 0);
  };

  if (loading) {
    return (
      <div className="accounts-page">
        <div className="loading">Chargement des comptes...</div>
      </div>
    );
  }

  return (
    <div className="accounts-page">
      <div className="accounts-header">
        <h1>💳 Mes Comptes</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Ajouter un compte
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="accounts-summary">
        <div className="summary-card">
          <h3>Total</h3>
          <p className="total-amount">
            {calculateTotalBalance().toFixed(2)} €
          </p>
          <span className="summary-label">{accounts.length} compte(s)</span>
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
                <span className="account-icon">
                  {ACCOUNT_TYPE_ICONS[account.type]}
                </span>
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
                {!account.is_active && (
                  <span className="inactive-badge">Inactif</span>
                )}
              </div>

              <div className="account-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleOpenModal(account)}
                >
                  Modifier
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(account.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingAccount ? "Modifier le compte" : "Nouveau compte"}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                  placeholder="Ex: Boursorama Courant"
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
                      {ACCOUNT_TYPE_ICONS[value as AccountType]} {label}
                    </option>
                  ))}
                </select>
              </div>

              {!editingAccount && (
                <div className="form-group">
                  <label htmlFor="initial_balance">Solde initial</label>
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
                  <small style={{ color: '#666', fontSize: '0.85em' }}>
                    Le solde initial ne pourra plus être modifié après création
                  </small>
                </div>
              )}

              {editingAccount && (
                <div className="form-group">
                  <label>Solde actuel</label>
                  <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <strong>{Number(editingAccount.initial_balance).toFixed(2)} {editingAccount.currency}</strong>
                    <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>
                      Le solde est calculé automatiquement selon vos transactions
                    </small>
                  </div>
                </div>
              )}

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
                  {editingAccount ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
