from flask import Flask, render_template, jsonify, request as flask_request
from dataclasses import dataclass
from typing import List, Dict
from collections import deque

app = Flask(__name__)

@dataclass
class Server:
    """
    Classe représentant un serveur dans le système de load balancing.
    Attributes:
        name (str): Identifiant unique du serveur (A, B ou C)
        weight (int): Poids du serveur pour l'algorithme Weighted Round Robin
        requests (List[str]): Liste des requêtes traitées par ce serveur
    """
    name: str
    weight: int
    requests: List[str] = None

    def __post_init__(self):
        """Initialise la liste des requêtes si elle n'existe pas"""
        self.requests = []

class LoadBalancer:
    """
    Classe implémentant l'algorithme Weighted Round Robin pour la distribution des requêtes.
    """
    def __init__(self, weights):
        """
        Initialise le load balancer avec les poids des serveurs.
        Args:
            weights (Dict[str, int]): Dictionnaire des poids pour chaque serveur
        """
        # Création des serveurs avec leurs poids respectifs
        self.servers = {
            'A': Server('A', weights['A']),
            'B': Server('B', weights['B']),
            'C': Server('C', weights['C'])
        }
        # Copie des poids initiaux pour le suivi des poids actuels
        self.current_weights = {name: server.weight for name, server in self.servers.items()}
        # Serveur actuel pour l'algorithme Round Robin
        self.current_server = 'A'
        # File d'attente pour les requêtes en attente
        self.request_queue = deque()

    def get_next_server(self) -> str:
        """
        Implémente l'algorithme Weighted Round Robin pour sélectionner le prochain serveur.
        Returns:
            str: Identifiant du serveur sélectionné
        """
        while True:
            # Si le serveur actuel a encore des "tickets" (poids > 0)
            if self.current_weights[self.current_server] > 0:
                self.current_weights[self.current_server] -= 1
                return self.current_server
            
            # Si tous les serveurs ont épuisé leurs tickets, on réinitialise les poids
            if all(w == 0 for w in self.current_weights.values()):
                self.current_weights = {name: server.weight for name, server in self.servers.items()}
            
            # Passage au serveur suivant dans l'ordre A -> B -> C -> A
            server_order = ['A', 'B', 'C']
            current_index = server_order.index(self.current_server)
            self.current_server = server_order[(current_index + 1) % len(server_order)]

    def process_requests(self, requests_by_branch):
        """
        Traite les requêtes de toutes les succursales de manière aléatoire.
        Args:
            requests_by_branch (Dict[str, int]): Nombre de requêtes par succursale
        Returns:
            List[Dict]: Liste des étapes de la simulation
        """
        simulation_steps = []
        
        # Création d'une liste de toutes les requêtes avec leur succursale
        all_requests = []
        for branch, count in requests_by_branch.items():
            for req_num in range(1, count + 1):
                all_requests.append((branch, f"{branch}-R{req_num}"))
        
        # Mélange des requêtes pour simuler l'arrivée simultanée
        import random
        random.shuffle(all_requests)
        
        # Traitement des requêtes dans l'ordre mélangé
        for branch, request_id in all_requests:
            server = self.get_next_server()
            self.servers[server].requests.append(request_id)
            simulation_steps.append({
                'request': request_id,
                'server': server
            })
        
        return simulation_steps

@app.route('/')
def index():
    """Route principale affichant l'interface de simulation"""
    return render_template('index.html')

@app.route('/simulate', methods=['POST'])
def simulate():
    """
    Route gérant la simulation du load balancing.
    Reçoit les poids des serveurs et le nombre de requêtes par succursale.
    Returns:
        JSON: Résultats de la simulation
    """
    # Récupération des données de la requête
    data = flask_request.get_json()
    weights = {
        'A': int(data['weights']['A']),
        'B': int(data['weights']['B']),
        'C': int(data['weights']['C'])
    }
    requests = {
        'S1': int(data['requests']['S1']),
        'S2': int(data['requests']['S2']),
        'S3': int(data['requests']['S3'])
    }
    
    # Création du load balancer et exécution de la simulation
    load_balancer = LoadBalancer(weights)
    simulation_steps = load_balancer.process_requests(requests)
    
    # Retour des résultats
    return jsonify({
        'steps': simulation_steps,
        'final_distribution': {
            name: len(server.requests)
            for name, server in load_balancer.servers.items()
        }
    })

if __name__ == '__main__':
    app.run(debug=True)