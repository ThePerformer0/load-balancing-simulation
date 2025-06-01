// Fonction pour mettre à jour la visualisation des poids
function updateWeightVisualization() {
    ['A', 'B', 'C'].forEach(server => {
        const weight = parseInt(document.getElementById(`weight-${server}`).value);
        const display = document.getElementById(`weight-display-${server}`);
        const visualization = document.getElementById(`weight-visualization-${server}`);
        
        display.textContent = weight;
        visualization.innerHTML = Array(weight).fill(0).map(() => 
            '<div class="inline-block w-2 h-2 bg-blue-500 rounded-full mx-0.5"></div>'
        ).join('');
    });
}

// Écouter les changements de poids
['A', 'B', 'C'].forEach(server => {
    document.getElementById(`weight-${server}`).addEventListener('change', updateWeightVisualization);
});

// Mettre à jour la visualisation initiale
updateWeightVisualization();

// Fonction pour initialiser les requêtes dans les succursales
function initializeRequests(requests) {
    // Nettoyer les pools de requêtes existants
    for (let i = 1; i <= 3; i++) {
        const pool = document.querySelector(`.request-pool-${i}`);
        pool.innerHTML = '';
    }
    
    // Ajouter les nouvelles requêtes
    Object.entries(requests).forEach(([branch, count]) => {
        const branchNum = branch.slice(1);
        const pool = document.querySelector(`.request-pool-${branchNum}`);
        
        for (let i = 1; i <= count; i++) {
            const requestElement = document.createElement('div');
            requestElement.className = `request-item request-branch-${branchNum}`;
            requestElement.textContent = `${branch}-R${i}`;
            pool.appendChild(requestElement);
        }
    });
}

document.getElementById('start-simulation').addEventListener('click', async () => {
    const button = document.getElementById('start-simulation');
    button.disabled = true;
    
    // Récupérer les paramètres
    const weights = {
        'A': parseInt(document.getElementById('weight-A').value),
        'B': parseInt(document.getElementById('weight-B').value),
        'C': parseInt(document.getElementById('weight-C').value)
    };
    
    const requests = {
        'S1': parseInt(document.getElementById('requests-1').value),
        'S2': parseInt(document.getElementById('requests-2').value),
        'S3': parseInt(document.getElementById('requests-3').value)
    };
    
    try {
        // Initialiser les requêtes dans les succursales
        initializeRequests(requests);
        
        const response = await fetch('/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ weights, requests })
        });
        const data = await response.json();
        
        // Nettoyer les résultats précédents
        document.getElementById('current-request').innerHTML = '';
        ['A', 'B', 'C'].forEach(server => {
            document.getElementById(`server-${server}-requests`).innerHTML = '';
        });
        
        // Animer chaque étape
        for (const step of data.steps) {
            await new Promise(resolve => {
                updateVisualization(step);
                setTimeout(resolve, 1000);
            });
        }
        
        // Afficher le résumé
        showSummary(data.final_distribution, weights);
    } catch (error) {
        console.error('Erreur lors de la simulation:', error);
    } finally {
        button.disabled = false;
    }
});

function updateVisualization(step) {
    const { request, server } = step;
    const branch = request.split('-')[0];
    const branchNum = branch.slice(1);
    
    // Retirer la requête de la succursale
    const requestElement = document.querySelector(`.request-pool-${branchNum} .request-item:first-child`);
    if (requestElement) {
        requestElement.remove();
    }
    
    // Ajouter la requête au load balancer
    const currentRequest = document.getElementById('current-request');
    const loadBalancerRequest = requestElement.cloneNode(true);
    loadBalancerRequest.style.animation = 'fadeIn 0.3s ease-in';
    currentRequest.innerHTML = '';
    currentRequest.appendChild(loadBalancerRequest);
    
    // Ajouter la requête au serveur
    const serverElement = document.getElementById(`server-${server}-requests`);
    const serverRequest = requestElement.cloneNode(true);
    serverRequest.style.animation = 'fadeIn 0.3s ease-in';
    serverElement.appendChild(serverRequest);
}

function showSummary(distribution, weights) {
    const summary = document.getElementById('summary');
    const results = document.getElementById('distribution-results');
    const explanation = document.getElementById('weight-explanation');
    
    // Calculer le total des requêtes
    const totalRequests = Object.values(distribution).reduce((a, b) => a + b, 0);
    
    results.innerHTML = `
        <div class="grid grid-cols-3 gap-4">
            ${Object.entries(distribution).map(([server, count]) => {
                const percentage = ((count / totalRequests) * 100).toFixed(1);
                return `
                    <div class="text-center">
                        <div class="font-bold">Serveur ${server}</div>
                        <div>${count} requêtes (${percentage}%)</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    explanation.innerHTML = `
        <p>Distribution basée sur les poids :</p>
        <ul class="list-disc pl-5 mt-2">
            ${Object.entries(weights).map(([server, weight]) => `
                <li>Serveur ${server}: poids ${weight} (${((weight / Object.values(weights).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}% des ressources)</li>
            `).join('')}
        </ul>
    `;
    
    summary.classList.remove('hidden');
}

function createArrowPath(startX, startY, endX, endY, branchNum) {
    const svg = document.getElementById('connection-lines');
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    // Calculer le chemin de la flèche
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    
    // Créer le chemin de la flèche
    const pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
    path.setAttribute("d", pathData);
    path.setAttribute("class", `arrow-line animated-arrow arrow-branch-${branchNum}`);
    
    // Ajouter la pointe de la flèche
    const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const arrowSize = 8;
    const arrowPoints = [
        [endX, endY],
        [endX - arrowSize * Math.cos(angle - Math.PI/6), endY - arrowSize * Math.sin(angle - Math.PI/6)],
        [endX - arrowSize * Math.cos(angle + Math.PI/6), endY - arrowSize * Math.sin(angle + Math.PI/6)]
    ];
    arrowHead.setAttribute("points", arrowPoints.map(p => p.join(",")).join(" "));
    arrowHead.setAttribute("class", `arrow-head arrow-head-branch-${branchNum}`);
    
    svg.appendChild(path);
    svg.appendChild(arrowHead);
    
    // Supprimer la flèche après l'animation
    setTimeout(() => {
        svg.removeChild(path);
        svg.removeChild(arrowHead);
    }, 1000);
} 