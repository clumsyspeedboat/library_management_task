```markdown
# Library Management Ontology with Neo4j

This project sets up a **Neo4j** graph database with the **Neosemantics (n10s)** plugin to manage a simple library ontology. The ontology models a library containing books, authors, genres, and publishers. The setup uses **Docker** and **Docker Compose** for easy deployment and management.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [1. Prepare the Project Directory](#1-prepare-the-project-directory)
  - [2. Place the Ontology File](#2-place-the-ontology-file)
  - [3. Start Neo4j with Docker Compose](#3-start-neo4j-with-docker-compose)
  - [4. Access Neo4j Browser](#4-access-neo4j-browser)
  - [5. Initialize Neosemantics Plugin](#5-initialize-neosemantics-plugin)
  - [6. Import the Ontology](#6-import-the-ontology)
  - [7. Verify the Import](#7-verify-the-import)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker:** [Download and Install Docker](https://www.docker.com/get-started)
- **Docker Compose:** [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Git:** [Download and Install Git](https://git-scm.com/downloads) *(optional, if cloning a repository)*

## Setup Instructions

Follow these steps to set up Neo4j with Neosemantics and import your ontology.

### 1. Prepare the Project Directory

1. **Create a Project Directory:**

   ```bash
   mkdir library_management_task
   cd library_management_task
   ```

2. **Create Necessary Subdirectories:**

   ```bash
   mkdir import data logs plugins
   ```

### 2. Place the Ontology File

1. **Add Your `ontology.ttl` File:**

   - Ensure you have your `ontology.ttl` file ready.
   - Copy or move the `ontology.ttl` file into the `import` directory.

   **Path Example:**

   ```
   library_management_task/import/ontology.ttl
   ```

### 3. Start Neo4j with Docker Compose

1. **Ensure `docker-compose.yml` is Configured:**

   - Place your `docker-compose.yml` file in the `library_management_task` directory.
   - **Note:** This guide assumes you have already configured `docker-compose.yml` with the necessary volume mappings and environment variables. If not, please refer to your project documentation or previous setup steps.

2. **Run Docker Compose:**

   ```bash
   docker-compose up -d
   ```

   - **`-d`**: Runs the containers in detached mode (in the background).

3. **Verify Containers are Running:**

   ```bash
   docker ps
   ```

   - You should see the `neo4j` container listed and running.

### 4. Access Neo4j Browser

1. **Open Your Web Browser:**

   - Navigate to [http://localhost:7474](http://localhost:7474)

2. **Log In:**

   - **Username:** `neo4j`
   - **Password:** `password` *(or as set in your `docker-compose.yml`)*

   *Note: On the first login, Neo4j may prompt you to change the default password. You can set it to `password` again for consistency.*

### 5. Initialize Neosemantics Plugin

1. **Open Neo4j Browser's Query Editor.**

2. **Run the Initialization Command:**

   ```cypher
   CALL n10s.graphconfig.init();
   ```

   - **Expected Outcome:** A success message indicating that the graph configuration has been initialized.

### 6. Import the Ontology

1. **Ensure `ontology.ttl` is in the Import Directory:**

   - **Host Path:** `library_management_task/import/ontology.ttl`
   - **Container Path:** `/var/lib/neo4j/import/ontology.ttl`

2. **Run the Import Command in Neo4j Browser:**

   ```cypher
   CALL n10s.rdf.import.fetch("file:///ontology.ttl", "Turtle");
   ```

   - **Parameters:**
     - **`"file:///ontology.ttl"`**: Specifies the file to import located in the `/var/lib/neo4j/import` directory inside the container.
     - **`"Turtle"`**: Indicates the RDF serialization format.

3. **Monitor the Import Process:**

   - After executing the command, you should receive a summary detailing the number of triples imported.

   **Example Response:**

   | terminationStatus | triplesLoaded | triplesParsed | namespaces | extraInfo | callParams    |
   |-------------------|---------------|----------------|------------|-----------|---------------|
   | "OK"              | 60            | 60             | ...        | ...       | {singleTx: false} |

### 7. Verify the Import

1. **Run a Query to Check Imported Data:**

   ```cypher
   MATCH (n)-[r]->(m)
   RETURN n, r, m
   LIMIT 100;
   ```

   - **Purpose:** Retrieves and visualizes nodes and their relationships.

2. **Retrieve Specific Information:**

   **Example 1: List All Books with Their Authors and Publishers**

   ```cypher
   MATCH (b:Book)-[:HAS_AUTHOR]->(a:Author),
         (b)-[:HAS_PUBLISHER]->(p:Publisher)
   RETURN b.title AS Book, a.name AS Author, p.name AS Publisher;
   ```

   **Example 2: List All Genres**

   ```cypher
   MATCH (g:Genre)
   RETURN g.name AS Genre;
   ```
