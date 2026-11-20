# ENSO Monitor

Application web de visualisation et de comparaison historique de l'indice climatique **Oceanic Niño Index (ONI)**, à partir des données publiées par la NOAA.

## 1. Présentation

ENSO Monitor permet de consulter l'évolution historique de l'ONI, un indicateur utilisé pour suivre les anomalies de température de surface de la mer dans la région Niño 3.4 du Pacifique équatorial.

L'application propose :

- Un tableau de bord présentant les observations ONI.
- Un graphique historique interactif avec filtres par année.
- Des indicateurs synthétiques calculés sur la période sélectionnée.
- Une comparaison entre les épisodes 1997–1998 et 2015–2016.
- Une API REST documentée pour consulter les données.
- Un pipeline ETL assurant l'importation des observations NOAA dans PostgreSQL.

Les données affichées proviennent de la NOAA CPC, série ONI basée sur ERSSTv6.

## 2. Architecture technique

| Composant | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Recharts |
| API REST | Python, FastAPI, Pydantic |
| Accès aux données | SQLAlchemy |
| Base de données | PostgreSQL |
| Migrations | Alembic |
| ETL | Python, Pandas, NumPy, Requests |
| Tests backend | Pytest |
| Tests frontend | Vitest, React Testing Library |
| Environnement local | Docker Compose pour PostgreSQL |

### Flux de données

1. L'ETL télécharge le tableau ONI depuis la NOAA.
2. Pandas transforme les données en observations structurées.
3. SQLAlchemy charge les observations dans PostgreSQL en évitant les doublons.
4. FastAPI expose les données via une API REST.
5. React récupère les observations et affiche les graphiques.

## 3. Prérequis

- Python 3.9 ou supérieur, sous réserve de compatibilité des dépendances installées.
- Node.js compatible avec la version de Vite utilisée.
- npm.
- Docker et Docker Compose.
- Git.

## 4. Installation

Cloner le dépôt :

```bash
git clone https://github.com/JoeLeDev/enso-monitor.git
cd enso-monitor
```

Créer le fichier d'environnement à partir du modèle :

```bash
cp .env.example .env
```

Renseigner `DATABASE_URL` avec les paramètres correspondant à la base PostgreSQL locale. Ne jamais committer de mots de passe dans Git.

Démarrer PostgreSQL :

```bash
docker compose up -d
```

Installer les dépendances backend :

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Appliquer les migrations :

```bash
alembic upgrade head
```

Importer les observations NOAA :

```bash
python -m etl.run
```

Lancer l'API :

```bash
python -m uvicorn app.main:app --reload
```

L'API est disponible sur `http://127.0.0.1:8000`.

Documentation interactive : `http://127.0.0.1:8000/docs`.

Dans un second terminal, installer et lancer le frontend :

```bash
cd frontend
npm install
npm run dev
```

Ouvrir l'URL locale indiquée par Vite.

## 5. Endpoints API

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Vérification de disponibilité de l'API |
| GET | `/api/v1/observations` | Liste chronologique des observations ONI |
| GET | `/api/v1/observations?start_year=1997&end_year=1998` | Filtrage par période |
| GET | `/api/v1/compare` | Comparaison de deux périodes historiques |

L'endpoint de comparaison accepte également les paramètres `start_year_1`, `end_year_1`, `start_year_2` et `end_year_2`.

Les paramètres invalides sont rejetés avec une réponse HTTP 422.

## 6. Tests et qualité

### Tests de transformation ETL

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/test_transform.py
```

### Tests API

```bash
python -m pytest tests/test_api_observations.py tests/test_api_comparison.py
```

### Tests de chargement PostgreSQL

Ces tests nécessitent une base de données dédiée `enso_monitor_test`, correctement configurée et migrée. Ne jamais les exécuter contre la base de développement ou de production.

### Tests frontend

```bash
cd frontend
npm run test
npm run lint
npm run build
```

Le test frontend vérifie que le changement de période modifie les observations transmises au graphique historique.

## 7. Modèle de données

La base contient quatre entités principales :

- `indices` : définition des indices climatiques.
- `sources` : origine des données.
- `imports` : historique des exécutions ETL, avec statut et empreinte SHA-256.
- `observations` : valeurs ONI associées à une année, une saison et un import.

Une contrainte d'unicité sur `(index_id, year, season)` empêche la duplication des observations.

## 8. Limites connues

- Le tableau de bord utilise actuellement l'indice ONI, et non RONI.
- Les données sont importées par exécution manuelle du pipeline ETL.
- La comparaison visuelle ne constitue pas une prédiction climatique.
- Les filtres du graphique historique sont appliqués côté client après le chargement des observations.
- Le déploiement VPS est proposé dans le dossier de conception, mais n'est pas présenté comme réalisé.
- Le bundle frontend génère un avertissement de taille lors du build ; un découpage du code peut être envisagé.

## 9. Sources

- NOAA Climate Prediction Center — ONI ERSSTv6 : https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/index.php
- NOAA Climate Prediction Center : https://www.cpc.ncep.noaa.gov/
- FastAPI : https://fastapi.tiangolo.com/
- React : https://react.dev/
- PostgreSQL : https://www.postgresql.org/

## 10. Utilisation de l'intelligence artificielle

Des outils d'intelligence artificielle (Cursor & ChatGPT) ont été utilisés comme assistance à la conception, au développement, au débogage et à la documentation.
