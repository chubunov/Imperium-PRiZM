// visualization.js - логика отображения графа

class ImperialVisualizer {
    constructor() {
        this.data = getVisualizationData();
        this.highlightedNodeId = null;
        this.selectedNodeId = null;
        
        // Элементы DOM
        this.svg = d3.select("#graph");
        this.width = this.svg.node().getBoundingClientRect().width;
        this.height = 700;
        this.container = this.svg.append("g");
        this.tooltip = d3.select("#tooltip");
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        this.nodeInfo = document.getElementById('node-info');
        
        this.init();
    }
    
    init() {
        this.setupZoom();
        this.createLegend();
        this.renderGraph();
        this.setupEventListeners();
        
        // Скрываем загрузку
        document.getElementById('loading').style.display = 'none';
    }
    
    setupZoom() {
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.container.attr("transform", event.transform);
            });
        
        this.svg.call(zoom);
    }
    
    createLegend() {
        const legendItems = document.querySelector('.legend-items');
        
        const legendData = [
            { color: '#FFD700', text: 'Администратор' },
            { color: '#4CAF50', text: 'Активный' },
            { color: '#FF9800', text: 'Ожидает' },
            { color: '#9E9E9E', text: 'Неактивный' },
            { color: '#FF4081', text: 'Выделенный' }
        ];
        
        legendItems.innerHTML = legendData.map(item => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${item.color}; border-color: ${item.color}"></div>
                <div class="legend-text">${item.text}</div>
            </div>
        `).join('');
    }
    
    renderGraph() {
        // Очищаем предыдущий граф
        this.container.selectAll("*").remove();
        
        // Создаем симуляцию
        this.simulation = d3.forceSimulation(this.data.nodes)
            .force("link", d3.forceLink(this.data.links)
                .id(d => d.id)
                .distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("collision", d3.forceCollide().radius(50));
        
        // Создаем связи
        this.link = this.container.append("g")
            .selectAll("line")
            .data(this.data.links)
            .join("line")
            .attr("class", d => `link ${d.isHighlighted ? 'highlighted' : ''}`)
            .attr("stroke", d => this.getLinkColor(d))
            .attr("stroke-width", d => d.isHighlighted ? 3 : 2)
            .attr("stroke-dasharray", d => d.flank === 2 ? "5,5" : "none");
        
        // Создаем узлы
        this.node = this.container.append("g")
            .selectAll("g")
            .data(this.data.nodes)
            .join("g")
            .attr("class", d => `node ${d.isHighlighted ? 'highlighted' : ''}`)
            .call(d3.drag()
                .on("start", this.dragstarted.bind(this))
                .on("drag", this.dragged.bind(this))
                .on("end", this.dragended.bind(this)));
        
        // Круги узлов
        this.node.append("circle")
            .attr("r", d => d.isHighlighted ? 35 : 30)
            .attr("fill", d => d.color)
            .attr("stroke", d => d.borderColor || '#CCCCCC')
            .attr("stroke-width", d => d.borderWidth || 1)
            .on("mouseover", this.showTooltip.bind(this))
            .on("mouseout", this.hideTooltip.bind(this))
            .on("click", this.selectNode.bind(this));
        
        // Текст узлов (эмодзи титула)
        this.node.append("text")
            .text(d => d.label)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "black")
            .attr("font-weight", "bold")
            .attr("font-size", d => d.isHighlighted ? "20px" : "16px")
            .style("pointer-events", "none");
        
        // Обновление позиций
        this.simulation.on("tick", () => {
            this.link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            this.node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }
    
    getLinkColor(link) {
        if (link.isHighlighted) return '#FF4081';
        switch (link.flank) {
            case 1: return '#FF6B6B'; // Левый
            case 2: return '#4ECDC4'; // Центр
            case 3: return '#FFD166'; // Правый
            default: return '#9E9E9E';
        }
    }
    
    dragstarted(event) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    dragended(event) {
        if (!event.active) this.simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    
    showTooltip(event, d) {
        this.tooltip
            .style("opacity", 1)
            .html(`
                <strong>${d.label} ${d.username}</strong><br>
                ID: ${d.id}<br>
                Титул: ${d.title}<br>
                Казна: ${d.treasury.toLocaleString('ru-RU')} PZM<br>
                Вассалов: ${d.vassals}<br>
                Статус: ${this.getStatusText(d.status)}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }
    
    hideTooltip() {
        this.tooltip.style("opacity", 0);
    }
    
    getStatusText(status) {
        const statusMap = {
            'admin': 'Администратор',
            'active': 'Активный',
            'pending': 'Ожидает',
            'inactive': 'Неактивный'
        };
        return statusMap[status] || status;
    }
    
    selectNode(event, d) {
        this.selectedNodeId = d.id;
        this.showNodeDetails(d);
    }
    
    showNodeDetails(node) {
        this.nodeInfo.innerHTML = `
            <h3>${node.label} ${node.username}</h3>
            <div class="node-details">
                <p><strong>ID:</strong> ${node.id}</p>
                <p><strong>Титул:</strong> ${node.title}</p>
                <p><strong>Казна:</strong> ${node.treasury.toLocaleString('ru-RU')} PZM</p>
                <p><strong>Вассалов:</strong> ${node.vassals}</p>
                <p><strong>Статус:</strong> ${this.getStatusText(node.status)}</p>
                <p><strong>Фланг:</strong> ${node.position === 1 ? 'Левый' : node.position === 2 ? 'Центр' : node.position === 3 ? 'Правый' : 'Не указан'}</p>
            </div>
            <button onclick="visualizer.highlightNode(${node.id})" class="btn" style="margin-top: 10px; width: 100%;">
                🔍 Выделить этого правителя
            </button>
        `;
    }
    
    highlightNode(nodeId) {
        // Снимаем выделение со всех
        this.data.nodes.forEach(n => n.isHighlighted = false);
        this.data.links.forEach(l => l.isHighlighted = false);
        
        // Выделяем выбранный узел
        const node = this.data.nodes.find(n => n.id === nodeId);
        if (node) {
            node.isHighlighted = true;
            this.highlightedNodeId = nodeId;
            this.selectedNodeId = nodeId;
            
            // Показываем детали
            this.showNodeDetails(node);
            
            // Обновляем граф
            this.renderGraph();
            
            // Центрируем на узле
            this.centerOnNode(nodeId);
        }
    }
    
    centerOnNode(nodeId) {
        const node = this.data.nodes.find(n => n.id === nodeId);
        if (!node || !node.x) return;
        
        const transform = d3.zoomIdentity
            .translate(this.width / 2 - node.x, this.height / 2 - node.y)
            .scale(1.5);
        
        this.svg.transition()
            .duration(750)
            .call(this.svg.__zoom.transform, transform);
    }
    
    setupEventListeners() {
        // Поиск
        document.getElementById('search-btn').addEventListener('click', () => this.performSearch());
        document.getElementById('clear-search').addEventListener('click', () => this.clearSearch());
        document.getElementById('highlight-connections').addEventListener('click', () => this.highlightConnections());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        
        // Поиск по Enter
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    }
    
    performSearch() {
        const query = this.searchInput.value.trim().toLowerCase();
        if (!query) return;
        
        const results = this.data.nodes.filter(node => 
            node.id.toString().includes(query) ||
            node.username.toLowerCase().includes(query) ||
            node.title.toLowerCase().includes(query)
        ).slice(0, 10);
        
        this.showSearchResults(results);
    }
    
    showSearchResults(results) {
        this.searchResults.innerHTML = '';
        
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
        } else {
            results.forEach(r => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div>
                        <div class="search-result-username">${r.label} ${r.username}</div>
                        <div class="search-result-details">ID: ${r.id} | ${r.title} | ${r.treasury.toLocaleString('ru-RU')} PZM</div>
                    </div>
                    <button onclick="visualizer.highlightNode(${r.id})" style="padding: 5px 10px; font-size: 12px;">🔍</button>
                `;
                item.addEventListener('click', () => this.highlightNode(r.id));
                this.searchResults.appendChild(item);
            });
        }
        
        this.searchResults.style.display = 'block';
    }
    
    clearSearch() {
        this.searchInput.value = '';
        this.searchResults.style.display = 'none';
        
        // Снимаем выделение
        this.data.nodes.forEach(n => n.isHighlighted = false);
        this.data.links.forEach(l => l.isHighlighted = false);
        this.highlightedNodeId = null;
        this.renderGraph();
        
        // Сбрасываем информацию о узле
        this.nodeInfo.innerHTML = `
            <h3>👤 Выберите правителя</h3>
            <p>Кликните на любой узел или найдите через поиск</p>
        `;
    }
    
    highlightConnections() {
        if (!this.highlightedNodeId) {
            alert("Сначала выберите узел для выделения! Кликните на узел или найдите через поиск.");
            return;
        }
        
        // Находим все связанные узлы
        const connectedNodeIds = new Set([this.highlightedNodeId]);
        
        // Находим предков
        this.data.links.forEach(link => {
            if (link.target.id === this.highlightedNodeId) {
                connectedNodeIds.add(link.source.id);
            }
        });
        
        // Находим потомков
        this.data.links.forEach(link => {
            if (link.source.id === this.highlightedNodeId) {
                connectedNodeIds.add(link.target.id);
            }
        });
        
        // Снимаем выделение со всех
        this.data.nodes.forEach(n => n.isHighlighted = false);
        this.data.links.forEach(l => l.isHighlighted = false);
        
        // Выделяем только связанные узлы
        this.data.nodes.forEach(n => {
            if (connectedNodeIds.has(n.id)) {
                n.isHighlighted = true;
            }
        });
        
        // Выделяем связи между связанными узлами
        this.data.links.forEach(l => {
            if (connectedNodeIds.has(l.source.id) && connectedNodeIds.has(l.target.id)) {
                l.isHighlighted = true;
            }
        });
        
        this.renderGraph();
    }
    
    resetView() {
        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(1);
        
        this.svg.transition()
            .duration(750)
            .call(this.svg.__zoom.transform, transform);
    }
}

// Глобальная переменная для доступа из HTML
let visualizer;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ImperialVisualizer();
});