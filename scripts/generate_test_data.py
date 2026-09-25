"""
MIMO FINANCE - Test Data Generator
Generates realistic, fully compliant SQL test data for solo users over a 2-year timeline.
All modules are populated:
- households (type: INDIVIDUAL)
- users (solo profiles with bcrypt password 'password123')
- categories (INCOME & EXPENSE with colors & icons)
- accounts (CHECKING & SAVINGS with initial_balance)
- recurring_templates (MONTHLY / WEEKLY templates)
- goals (Épargne / Savings goals with monthly contributions)
- projects & project_items (Financial projects with items & budgets)
- transactions (24 months of REALIZED past transactions + 3 months of PROJECTED future transactions)
"""

import os
import uuid
import random
import datetime

# Fixed deterministic namespace for reproducible UUIDs
NAMESPACE = uuid.UUID('12345678-1234-5678-1234-567812345678')

def make_uuid(name: str) -> str:
    return str(uuid.uuid5(NAMESPACE, name))

def sql_escape(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(round(value, 2) if isinstance(value, float) else value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'" if isinstance(value, datetime.datetime) else f"'{value.strftime('%Y-%m-%d')}'"
    # String: escape single quotes
    s = str(value).replace("'", "''")
    return f"'{s}'"

def generate_insert(table: str, data: dict) -> str:
    cols = ", ".join(data.keys())
    vals = ", ".join(sql_escape(v) for v in data.values())
    return f"INSERT INTO {table} ({cols}) VALUES ({vals});"

def main():
    print(">>> Démarrage de la génération des données de test Mimo...")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, ".."))
    out_file = os.path.join(root_dir, "test_data.sql")
    
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=730) # 2 ans d'historique
    future_date = today + datetime.timedelta(days=90) # 3 mois de projection
    
    # Bcrypt hash for 'password123'
    PASSWORD_HASH = "$2b$12$/rAIn0eflJcr9fG3y1MvUeCxf0Kqrtkqb9BboPjnP4atmX3G..u3m"
    
    # 3 Profils Solo (100% INDIVIDUAL, aucun compte couple)
    profiles = [
        {
            "key": "alex",
            "first_name": "Alexandre",
            "last_name": "DUPONT",
            "email": "alexandre@test.com",
            "role": "Salarié CDI",
            "salary": 2600.0,
            "rent": 780.0,
            "checking_init": 1500.0,
            "savings_init": 4500.0,
        },
        {
            "key": "sophie",
            "first_name": "Sophie",
            "last_name": "MARTIN",
            "email": "sophie@test.com",
            "role": "Freelance Tech",
            "salary": 3400.0,
            "rent": 920.0,
            "checking_init": 2200.0,
            "savings_init": 8000.0,
        },
        {
            "key": "lucas",
            "first_name": "Lucas",
            "last_name": "BERNARD",
            "email": "lucas@test.com",
            "role": "Étudiant / Alternant",
            "salary": 950.0,
            "rent": 420.0,
            "checking_init": 450.0,
            "savings_init": 1200.0,
        }
    ]
    
    # Collect IDs for clean deletion / idempotence
    all_hh_ids = [make_uuid(f"hh_{p['key']}") for p in profiles]
    all_user_ids = [make_uuid(f"user_{p['key']}") for p in profiles]
    all_emails = [p['email'] for p in profiles]

    with open(out_file, "w", encoding="utf-8") as f:
        f.write("-- ==========================================================\n")
        f.write("-- MIMO FINANCE - DONNÉES DE TEST OFFICIELLES (SOLO - 2 ANS)\n")
        f.write("-- ==========================================================\n")
        f.write("-- Utilisateurs créés avec mot de passe : password123\n")
        f.write("-- alexandre@test.com | sophie@test.com | lucas@test.com\n")
        f.write("-- ==========================================================\n\n")
        f.write("BEGIN;\n\n")
        
        # 0. Nettoyage idempotent des profils de test existants
        f.write("-- 0. Nettoyage des anciennes données de test (idempotent)\n")
        hh_list = ", ".join(f"'{hid}'" for hid in all_hh_ids)
        u_list = ", ".join(f"'{uid}'" for uid in all_user_ids)
        email_list = ", ".join(f"'{em}'" for em in all_emails)
        
        f.write(f"DELETE FROM project_items WHERE project_id IN (SELECT id FROM projects WHERE household_id IN ({hh_list}));\n")
        f.write(f"DELETE FROM transactions WHERE household_id IN ({hh_list});\n")
        f.write(f"DELETE FROM projects WHERE household_id IN ({hh_list});\n")
        f.write(f"DELETE FROM goals WHERE created_by IN ({u_list}) OR user_id IN ({u_list}) OR household_id IN ({hh_list});\n")
        f.write(f"DELETE FROM recurring_templates WHERE household_id IN ({hh_list});\n")
        f.write(f"DELETE FROM accounts WHERE household_id IN ({hh_list});\n")
        f.write(f"DELETE FROM categories WHERE household_id IN ({hh_list});\n")
        f.write(f"DELETE FROM users WHERE id IN ({u_list}) OR email IN ({email_list});\n")
        f.write(f"DELETE FROM households WHERE id IN ({hh_list});\n\n")
        
        for prof in profiles:
            k = prof["key"]
            hh_id = make_uuid(f"hh_{k}")
            u_id = make_uuid(f"user_{k}")
            
            f.write(f"-- ==========================================================\n")
            f.write(f"-- Profil : {prof['first_name']} {prof['last_name']} ({prof['role']})\n")
            f.write(f"-- Email  : {prof['email']} (Mot de passe: password123)\n")
            f.write(f"-- ==========================================================\n\n")
            
            # 1. Household
            f.write("-- Household\n")
            f.write(generate_insert("households", {
                "id": hh_id,
                "name": f"Foyer de {prof['first_name']} {prof['last_name']}",
                "type": "INDIVIDUAL",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0)),
                "status": "ACTIVE"
            }) + "\n\n")
            
            # 2. User
            f.write("-- User\n")
            f.write(generate_insert("users", {
                "id": u_id,
                "email": prof['email'],
                "password_hash": PASSWORD_HASH,
                "first_name": prof['first_name'],
                "last_name": prof['last_name'],
                "is_active": True,
                "household_id": hh_id,
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0)),
                "avatar_url": None
            }) + "\n\n")
            
            # 3. Categories
            f.write("-- Categories\n")
            standard_cats = [
                ("Salaire", "INCOME", "💰", "#27AE60"),
                ("Revenus complémentaires", "INCOME", "🎁", "#2ECC71"),
                ("Logement", "EXPENSE", "🏠", "#F39C12"),
                ("Alimentation", "EXPENSE", "🛒", "#E67E22"),
                ("Transports", "EXPENSE", "🚗", "#34495E"),
                ("Loisirs & Sorties", "EXPENSE", "🎉", "#9B59B6"),
                ("Abonnements", "EXPENSE", "📱", "#3498DB"),
                ("Santé", "EXPENSE", "💊", "#E74C3C"),
                ("Shopping", "EXPENSE", "🛍️", "#1ABC9C"),
                ("Imprévus", "EXPENSE", "⚡", "#95A5A6"),
            ]
            cat_map = {}
            for c_name, c_type, c_icon, c_color in standard_cats:
                cid = make_uuid(f"cat_{k}_{c_name}")
                cat_map[c_name] = cid
                f.write(generate_insert("categories", {
                    "id": cid,
                    "household_id": hh_id,
                    "name": c_name,
                    "type": c_type,
                    "icon": c_icon,
                    "color": c_color,
                    "parent_id": None,
                    "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                    "updated_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                }) + "\n")
            f.write("\n")
            
            # 4. Accounts
            f.write("-- Accounts\n")
            acc_checking = make_uuid(f"acc_chk_{k}")
            acc_savings = make_uuid(f"acc_sav_{k}")
            
            f.write(generate_insert("accounts", {
                "id": acc_checking,
                "household_id": hh_id,
                "name": "Compte Courant Principal",
                "type": "CHECKING",
                "initial_balance": prof["checking_init"],
                "currency": "EUR",
                "is_active": "true",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0)),
                "closed_at": None,
                "original_owner_user_id": u_id,
                "logo_url": None
            }) + "\n")
            
            f.write(generate_insert("accounts", {
                "id": acc_savings,
                "household_id": hh_id,
                "name": "Livret Épargne (Livret A)",
                "type": "SAVINGS",
                "initial_balance": prof["savings_init"],
                "currency": "EUR",
                "is_active": "true",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0)),
                "closed_at": None,
                "original_owner_user_id": u_id,
                "logo_url": None
            }) + "\n\n")
            
            # 5. Recurring Templates
            f.write("-- Recurring Templates\n")
            rec_salary = make_uuid(f"rec_sal_{k}")
            rec_rent = make_uuid(f"rec_rent_{k}")
            rec_net = make_uuid(f"rec_net_{k}")
            rec_gym = make_uuid(f"rec_gym_{k}")
            
            f.write(generate_insert("recurring_templates", {
                "id": rec_salary,
                "name": f"Versement {prof['role']}",
                "amount": prof['salary'],
                "type": "INCOME",
                "description": f"Rémunération mensuelle {prof['first_name']}",
                "frequency": "MONTHLY",
                "start_date": start_date,
                "end_date": None,
                "day_of_month": 28,
                "day_of_week": None,
                "custom_days": None,
                "household_id": hh_id,
                "account_id": acc_checking,
                "destination_account_id": None,
                "category_id": cat_map["Salaire"],
                "is_active": "true",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": None
            }) + "\n")
            
            f.write(generate_insert("recurring_templates", {
                "id": rec_rent,
                "name": "Loyer & Charges",
                "amount": prof['rent'],
                "type": "EXPENSE",
                "description": "Prélèvement loyer appartement",
                "frequency": "MONTHLY",
                "start_date": start_date,
                "end_date": None,
                "day_of_month": 5,
                "day_of_week": None,
                "custom_days": None,
                "household_id": hh_id,
                "account_id": acc_checking,
                "destination_account_id": None,
                "category_id": cat_map["Logement"],
                "is_active": "true",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": None
            }) + "\n")
            
            f.write(generate_insert("recurring_templates", {
                "id": rec_net,
                "name": "Forfait Mobile & Internet",
                "amount": 39.99,
                "type": "EXPENSE",
                "description": "Abonnement fibre et mobile",
                "frequency": "MONTHLY",
                "start_date": start_date,
                "end_date": None,
                "day_of_month": 10,
                "day_of_week": None,
                "custom_days": None,
                "household_id": hh_id,
                "account_id": acc_checking,
                "destination_account_id": None,
                "category_id": cat_map["Abonnements"],
                "is_active": "true",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": None
            }) + "\n")
            
            f.write(generate_insert("recurring_templates", {
                "id": rec_gym,
                "name": "Abonnement Fitness & Loisirs",
                "amount": 29.99,
                "type": "EXPENSE",
                "description": "Salle de sport",
                "frequency": "MONTHLY",
                "start_date": start_date,
                "end_date": None,
                "day_of_month": 15,
                "day_of_week": None,
                "custom_days": None,
                "household_id": hh_id,
                "account_id": acc_checking,
                "destination_account_id": None,
                "category_id": cat_map["Loisirs & Sorties"],
                "is_active": "true",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": None
            }) + "\n\n")
            
            # 6. Goals (Épargne)
            f.write("-- Goals (Épargne)\n")
            goal_1 = make_uuid(f"goal_1_{k}")
            goal_2 = make_uuid(f"goal_2_{k}")
            
            f.write(generate_insert("goals", {
                "id": goal_1,
                "household_id": None, # Exclusif: user_id renseigné pour solo
                "user_id": u_id,
                "created_by": u_id,
                "name": "Fonds de Sécurité",
                "description": "Épargne de précaution 3 à 6 mois de dépenses",
                "target_amount": 5000.0,
                "current_amount": 3200.0,
                "target_date": today + datetime.timedelta(days=365),
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0)),
                "monthly_contribution": 150.0,
                "account_id": acc_checking,
                "destination_account_id": acc_savings
            }) + "\n")
            
            f.write(generate_insert("goals", {
                "id": goal_2,
                "household_id": None,
                "user_id": u_id,
                "created_by": u_id,
                "name": "Grand Voyage Découverte",
                "description": "Objectif vacances et voyage",
                "target_amount": 3000.0,
                "current_amount": 1600.0,
                "target_date": today + datetime.timedelta(days=240),
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0)),
                "monthly_contribution": 200.0,
                "account_id": acc_checking,
                "destination_account_id": acc_savings
            }) + "\n\n")
            
            # 7. Projects & Project Items
            f.write("-- Projects & Items\n")
            proj_1 = make_uuid(f"proj_1_{k}")
            f.write(generate_insert("projects", {
                "id": proj_1,
                "household_id": hh_id,
                "created_by": u_id,
                "name": "Vacances d'Été 2027",
                "description": "Road trip et repos estival",
                "color": "#3B82F6",
                "icon": "Compass",
                "target_start_date": today + datetime.timedelta(days=300),
                "target_end_date": today + datetime.timedelta(days=315),
                "total_budget": 1850.0,
                "status": "COMMITTED",
                "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                "updated_at": datetime.datetime.combine(today, datetime.time(9, 0))
            }) + "\n")
            
            items = [
                ("Billets de transport", 320.0, today + datetime.timedelta(days=250), cat_map["Transports"]),
                ("Réservation Hébergement", 880.0, today + datetime.timedelta(days=280), cat_map["Logement"]),
                ("Activités et Restaurants", 650.0, today + datetime.timedelta(days=305), cat_map["Loisirs & Sorties"])
            ]
            for it_name, it_amt, it_date, it_cat in items:
                it_id = make_uuid(f"pi_{k}_{it_name}")
                f.write(generate_insert("project_items", {
                    "id": it_id,
                    "project_id": proj_1,
                    "account_id": acc_checking,
                    "category_id": it_cat,
                    "owner_user_id": u_id,
                    "transaction_id": None,
                    "name": it_name,
                    "amount": it_amt,
                    "planned_date": it_date,
                    "notes": f"Planifié pour {prof['first_name']}",
                    "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)),
                    "updated_at": datetime.datetime.combine(today, datetime.time(9, 0))
                }) + "\n")
            f.write("\n")
            
            # 8. Transactions (2 ans de passé REALIZED + 3 mois futurs PROJECTED)
            f.write("-- Transactions (24 mois passés REALIZED + projections futures)\n")
            
            # Itérer mois par mois
            curr_month_start = datetime.date(start_date.year, start_date.month, 1)
            end_month = datetime.date(future_date.year, future_date.month, 1)
            
            tx_count = 0
            while curr_month_start <= end_month:
                y = curr_month_start.year
                m = curr_month_start.month
                
                # Prochain mois
                if m == 12:
                    next_month_start = datetime.date(y + 1, 1, 1)
                else:
                    next_month_start = datetime.date(y, m + 1, 1)
                
                # 1. Salaire (28 du mois ou dernier jour)
                sal_day = min(28, (next_month_start - datetime.timedelta(days=1)).day)
                sal_date = datetime.date(y, m, sal_day)
                sal_state = "REALIZED" if sal_date <= today else "PROJECTED"
                sal_var = round(prof['salary'] + (random.uniform(-40, 60) if prof['key'] == 'sophie' else 0), 2)
                
                f.write(generate_insert("transactions", {
                    "id": make_uuid(f"tx_sal_{k}_{y}_{m}"),
                    "household_id": hh_id,
                    "account_id": acc_checking,
                    "category_id": cat_map["Salaire"],
                    "destination_account_id": None,
                    "amount": sal_var, # Positif pour revenu
                    "transaction_date": sal_date,
                    "type": "INCOME",
                    "description": f"Versement Salaire {m:02d}/{y}",
                    "notes": None,
                    "recurrence_frequency": "NONE",
                    "recurrence_end_date": None,
                    "parent_transaction_id": None,
                    "is_active": True,
                    "deleted_at": None,
                    "created_at": datetime.datetime.combine(sal_date, datetime.time(8, 0)),
                    "updated_at": datetime.datetime.combine(sal_date, datetime.time(8, 0)),
                    "recurring_template_id": rec_salary,
                    "state": sal_state,
                    "owner_type": "PERSONAL",
                    "owner_user_id": u_id,
                    "goal_id": None,
                    "project_id": None
                }) + "\n")
                tx_count += 1
                
                # 2. Loyer (5 du mois)
                rent_date = datetime.date(y, m, 5)
                rent_state = "REALIZED" if rent_date <= today else "PROJECTED"
                f.write(generate_insert("transactions", {
                    "id": make_uuid(f"tx_rent_{k}_{y}_{m}"),
                    "household_id": hh_id,
                    "account_id": acc_checking,
                    "category_id": cat_map["Logement"],
                    "destination_account_id": None,
                    "amount": -round(prof['rent'], 2), # Négatif pour dépense
                    "transaction_date": rent_date,
                    "type": "EXPENSE",
                    "description": f"Loyer appartement {m:02d}/{y}",
                    "notes": None,
                    "recurrence_frequency": "NONE",
                    "recurrence_end_date": None,
                    "parent_transaction_id": None,
                    "is_active": True,
                    "deleted_at": None,
                    "created_at": datetime.datetime.combine(rent_date, datetime.time(7, 30)),
                    "updated_at": datetime.datetime.combine(rent_date, datetime.time(7, 30)),
                    "recurring_template_id": rec_rent,
                    "state": rent_state,
                    "owner_type": "PERSONAL",
                    "owner_user_id": u_id,
                    "goal_id": None,
                    "project_id": None
                }) + "\n")
                tx_count += 1
                
                # 3. Forfait Mobile & Box (10 du mois)
                net_date = datetime.date(y, m, 10)
                net_state = "REALIZED" if net_date <= today else "PROJECTED"
                f.write(generate_insert("transactions", {
                    "id": make_uuid(f"tx_net_{k}_{y}_{m}"),
                    "household_id": hh_id,
                    "account_id": acc_checking,
                    "category_id": cat_map["Abonnements"],
                    "destination_account_id": None,
                    "amount": -39.99,
                    "transaction_date": net_date,
                    "type": "EXPENSE",
                    "description": "Prélèvement Forfait Télécom",
                    "notes": None,
                    "recurrence_frequency": "NONE",
                    "recurrence_end_date": None,
                    "parent_transaction_id": None,
                    "is_active": True,
                    "deleted_at": None,
                    "created_at": datetime.datetime.combine(net_date, datetime.time(6, 0)),
                    "updated_at": datetime.datetime.combine(net_date, datetime.time(6, 0)),
                    "recurring_template_id": rec_net,
                    "state": net_state,
                    "owner_type": "PERSONAL",
                    "owner_user_id": u_id,
                    "goal_id": None,
                    "project_id": None
                }) + "\n")
                tx_count += 1
                
                # 4. Épargne mensuelle vers Livret (29 du mois)
                sav_day = min(29, (next_month_start - datetime.timedelta(days=1)).day)
                sav_date = datetime.date(y, m, sav_day)
                sav_state = "REALIZED" if sav_date <= today else "PROJECTED"
                sav_amount = 150.0 if prof['key'] == 'lucas' else 250.0
                f.write(generate_insert("transactions", {
                    "id": make_uuid(f"tx_sav_{k}_{y}_{m}"),
                    "household_id": hh_id,
                    "account_id": acc_checking,
                    "category_id": None,
                    "destination_account_id": acc_savings,
                    "amount": -round(sav_amount, 2),
                    "transaction_date": sav_date,
                    "type": "TRANSFER",
                    "description": f"Virement automatique vers Livret A",
                    "notes": "Épargne mensuelle programmée",
                    "recurrence_frequency": "NONE",
                    "recurrence_end_date": None,
                    "parent_transaction_id": None,
                    "is_active": True,
                    "deleted_at": None,
                    "created_at": datetime.datetime.combine(sav_date, datetime.time(10, 0)),
                    "updated_at": datetime.datetime.combine(sav_date, datetime.time(10, 0)),
                    "recurring_template_id": None,
                    "state": sav_state,
                    "owner_type": "PERSONAL",
                    "owner_user_id": u_id,
                    "goal_id": goal_1,
                    "project_id": None
                }) + "\n")
                tx_count += 1
                
                # 5. Dépenses de la vie courante (Courses, Sorties, Transport)
                # Uniquement pour les mois passés (ou mois courant)
                if curr_month_start <= today:
                    # 4 courses par mois
                    for c_idx in range(1, 5):
                        c_day = min(3 + c_idx * 7, (next_month_start - datetime.timedelta(days=1)).day)
                        c_date = datetime.date(y, m, c_day)
                        if c_date > today:
                            continue
                        c_amt = round(random.uniform(45.0, 110.0), 2)
                        f.write(generate_insert("transactions", {
                            "id": make_uuid(f"tx_food_{k}_{y}_{m}_{c_idx}"),
                            "household_id": hh_id,
                            "account_id": acc_checking,
                            "category_id": cat_map["Alimentation"],
                            "destination_account_id": None,
                            "amount": -c_amt,
                            "transaction_date": c_date,
                            "type": "EXPENSE",
                            "description": f"Courses Supermarché ({c_idx})",
                            "notes": None,
                            "recurrence_frequency": "NONE",
                            "recurrence_end_date": None,
                            "parent_transaction_id": None,
                            "is_active": True,
                            "deleted_at": None,
                            "created_at": datetime.datetime.combine(c_date, datetime.time(18, 30)),
                            "updated_at": datetime.datetime.combine(c_date, datetime.time(18, 30)),
                            "recurring_template_id": None,
                            "state": "REALIZED",
                            "owner_type": "PERSONAL",
                            "owner_user_id": u_id,
                            "goal_id": None,
                            "project_id": None
                        }) + "\n")
                        tx_count += 1
                        
                    # 2-3 sorties / loisirs
                    for l_idx in range(1, 3):
                        l_day = min(6 + l_idx * 11, (next_month_start - datetime.timedelta(days=1)).day)
                        l_date = datetime.date(y, m, l_day)
                        if l_date > today:
                            continue
                        l_amt = round(random.uniform(22.0, 65.0), 2)
                        f.write(generate_insert("transactions", {
                            "id": make_uuid(f"tx_loisir_{k}_{y}_{m}_{l_idx}"),
                            "household_id": hh_id,
                            "account_id": acc_checking,
                            "category_id": cat_map["Loisirs & Sorties"],
                            "destination_account_id": None,
                            "amount": -l_amt,
                            "transaction_date": l_date,
                            "type": "EXPENSE",
                            "description": "Restaurant / Sortie",
                            "notes": None,
                            "recurrence_frequency": "NONE",
                            "recurrence_end_date": None,
                            "parent_transaction_id": None,
                            "is_active": True,
                            "deleted_at": None,
                            "created_at": datetime.datetime.combine(l_date, datetime.time(20, 0)),
                            "updated_at": datetime.datetime.combine(l_date, datetime.time(20, 0)),
                            "recurring_template_id": None,
                            "state": "REALIZED",
                            "owner_type": "PERSONAL",
                            "owner_user_id": u_id,
                            "goal_id": None,
                            "project_id": None
                        }) + "\n")
                        tx_count += 1
                        
                    # 2 transports par mois
                    for t_idx in range(1, 3):
                        t_day = min(4 + t_idx * 12, (next_month_start - datetime.timedelta(days=1)).day)
                        t_date = datetime.date(y, m, t_day)
                        if t_date > today:
                            continue
                        t_amt = round(random.uniform(15.0, 50.0), 2)
                        f.write(generate_insert("transactions", {
                            "id": make_uuid(f"tx_transp_{k}_{y}_{m}_{t_idx}"),
                            "household_id": hh_id,
                            "account_id": acc_checking,
                            "category_id": cat_map["Transports"],
                            "destination_account_id": None,
                            "amount": -t_amt,
                            "transaction_date": t_date,
                            "type": "EXPENSE",
                            "description": "Carburant / Ticket Transport",
                            "notes": None,
                            "recurrence_frequency": "NONE",
                            "recurrence_end_date": None,
                            "parent_transaction_id": None,
                            "is_active": True,
                            "deleted_at": None,
                            "created_at": datetime.datetime.combine(t_date, datetime.time(12, 15)),
                            "updated_at": datetime.datetime.combine(t_date, datetime.time(12, 15)),
                            "recurring_template_id": None,
                            "state": "REALIZED",
                            "owner_type": "PERSONAL",
                            "owner_user_id": u_id,
                            "goal_id": None,
                            "project_id": None
                        }) + "\n")
                        tx_count += 1
                
                curr_month_start = next_month_start
            
            f.write(f"\n-- {tx_count} transactions générées pour {prof['first_name']}\n\n")

        # Un seul COMMIT à la fin de tout le script
        f.write("COMMIT;\n")

    print(f"\n=================================================================")
    print(f" >>> SUCCÈS : Fichier test_data.sql généré avec succès !")
    print(f"=================================================================")
    print(f" Utilisateurs de test créés (Profils Solo - Mot de passe unique) :")
    print(f"-----------------------------------------------------------------")
    print(f" 1. Alexandre DUPONT (Salarié CDI - 2600 €/m)")
    print(f"    - Email    : alexandre@test.com")
    print(f"    - Password : password123")
    print(f"")
    print(f" 2. Sophie MARTIN (Freelance Tech - 3400 €/m)")
    print(f"    - Email    : sophie@test.com")
    print(f"    - Password : password123")
    print(f"")
    print(f" 3. Lucas BERNARD (Étudiant / Alternant - 950 €/m)")
    print(f"    - Email    : lucas@test.com")
    print(f"    - Password : password123")
    print(f"=================================================================\n")

if __name__ == "__main__":
    main()
