// visualization.js - логика отображения графа

class ImperialVisualizer {
    constructor() {
        console.log('Инициализация ImperialVisualizer...');
        
        // Получаем данные
        if (typeof getVisualizationData === 'undefined') {
            console.error('Ошибка: функция getVisualizationData не найдена!');
            document.getElementById('loading').innerHTML = 
                '<div style="color: #f44336; text-align: center; padding: 20px;">❌ Ошибка: данные не загружены</div>';
            return;
        }
        
        this.data = getVisualizationData();
        console.log('Данные получены, узлов:', this.data.nodes.length);
        
        this.highlightedNodeId = null;
        this.selectedNodeId = null;
        
        // Элементы DOM
        this.svg = d3.select("#graph");
        this.width = this.svg.node().getBoundingClientRect().width;
        this.height = 700;
        this.container = this.svg.append("g");
        this.tooltip = d3.select("#tooltip");
        this.nodeInfo = document.getElementById('node-info');
        
        // Инициализация
        this.init();
    }
    
    init() {
        console.log('Инициализация визуализации...');
        
        try {
            this.setupZoom();
            this.renderGraph();
            this.setupEventListeners();
            
            // Скрываем загрузку
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            console.log('Визуализация успешно инициализирована');
            
        } catch (error) {
            console.error('Ошибка при инициализации:', error);
            document.getElementById('loading').innerHTML = 
                '<div style="color: #f44336; text-align: center; padding: 20px;">❌ Ошибка при создании визуализации</div>';
        }
    }
    
    setupZoom() {
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.container.attr("transform", event.transform);
            });
        
        this.svg.call(zoom);
    }
    
    renderGraph() {
        console.log('Отрисовка графа...');
        
        // Очищаем предыдущий граф
        this.container.selectAll("*").remove();
        
        // Создаем симуляцию
        this.simulation = d3.forceSimulation(this.data.nodes)
            .force("link", d3.forceLink(this.data.links)
                .id(d => d.id)
                .distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("collision", d3.forceCollide().radius(40));
        
        // Создаем связи
        this.link = this.container.append("g")
            .selectAll("line")
            .data(this.data.links)
            .join("line")
            .attr("class", "link")
            .attr("stroke", d => this.getLinkColor(d))
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", d => d.flank === 2 ? "5,5" : "none");
        
        // Создаем узлы
        this.node = this.container.append("g")
            .selectAll("g")
            .data(this.data.nodes)
            .join("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", this.dragstarted.bind(this))
                .on("drag", this.dragged.bind(this))
                .on("end", this.dragended.bind(this)));
        
        // Круги узлов
        this.node.append("circle")
            .attr("r", 25)
            .attr("fill", d => d.color)
            .attr("stroke", d => d.borderColor || '#CCCCCC')
            .attr("stroke-width", d => d.borderWidth || 2)
            .on("mouseover", this.showTooltip.bind(this))
            .on("mouseout", this.hideTooltip.bind(this))
            .on("click", this.selectNode.bind(this));
        
        // Текст узлов (эмодзи титула)
        this.node.append("text")
            .text(d => d.label)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .attr("font-size", "16px")
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
        
        console.log('Граф отрисован');
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
        console.log('Выбран узел:', d.id, d.username);
        this.selectedNodeId = d.id;
        this.highlightNode(d.id);
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
            <button onclick="window.visualizer.highlightNode(${node.id})" class="btn" style="margin-top: 10px; width: 100%;">
                🔍 Выделить этого правителя
            </button>
        `;
    }
    
    highlightNode(nodeId) {
        console.log('Выделение узла:', nodeId);
        
        // Снимаем выделение со всех
        this.data.nodes.forEach(n => {
            n.isHighlighted = false;
            n.previousR = 25;
        });
        
        this.data.links.forEach(l => l.isHighlighted = false);
        
        // Выделяем выбранный узел
        const node = this.data.nodes.find(n => n.id === nodeId);
        if (node) {
            node.isHighlighted = true;
            node.previousR = 25;
            this.highlightedNodeId = nodeId;
            this.selectedNodeId = nodeId;
            
            // Обновляем отображение
            this.updateNodeAppearance();
            
            // Показываем детали
            this.showNodeDetails(node);
        }
    }
    
    updateNodeAppearance() {
        this.node.selectAll("circle")
            .transition()
            .duration(300)
            .attr("r", d => d.isHighlighted ? 35 : 25)
            .attr("stroke-width", d => d.isHighlighted ? 4 : d.borderWidth || 2);
        
        this.node.selectAll("text")
            .transition()
            .duration(300)
            .attr("font-size", d => d.isHighlighted ? "20px" : "16px");
        
        this.link
            .transition()
            .duration(300)
            .attr("stroke-width", d => d.isHighlighted ? 3 : 2)
            .attr("stroke", d => this.getLinkColor(d));
    }
    
    setupEventListeners() {
        console.log('Настройка обработчиков событий...');
        
        // Поиск
        const searchBtn = document.getElementById('search-btn');
        const clearSearchBtn = document.getElementById('clear-search');
        const highlightConnectionsBtn = document.getElementById('highlight-connections');
        const resetViewBtn = document.getElementById('reset-view');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn) searchBtn.addEventListener('click', () => this.performSearch());
        if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => this.clearSearch());
        if (highlightConnectionsBtn) highlightConnectionsBtn.addEventListener('click', () => this.highlightConnections());
        if (resetViewBtn) resetViewBtn.addEventListener('click', () => this.resetView());
        
        // Поиск по Enter
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }
        
        console.log('Обработчики событий настроены');
    }
    
    performSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        const query = searchInput.value.trim().toLowerCase();
        if (!query) return;
        
        console.log('Поиск:', query);
        
        const results = this.data.nodes.filter(node => 
            node.id.toString().includes(query) ||
            node.username.toLowerCase().includes(query) ||
            node.title.toLowerCase().includes(query)
        ).slice(0, 10);
        
        this.showSearchResults(results);
    }
    
    showSearchResults(results) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
        } else {
            results.forEach(r => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div>
                        <div class="search-result-username">${r.label} ${r.username}</div>
                        <div class="search-result-details">ID: ${r.id} | ${r.title} | ${r.treasury.toLocaleString('ru-RU')} PZM</div>
                    </div>
                    <button onclick="window.visualizer.highlightNode(${r.id})" style="padding: 5px 10px; font-size: 12px; background: #764ba2; color: white; border: none; border-radius: 4px; cursor: pointer;">🔍</button>
                `;
                item.addEventListener('click', () => this.highlightNode(r.id));
                searchResults.appendChild(item);
            });
        }
        
        searchResults.style.display = 'block';
    }
    
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.style.display = 'none';
        
        // Снимаем выделение
        this.data.nodes.forEach(n => {
            n.isHighlighted = false;
        });
        
        this.data.links.forEach(l => l.isHighlighted = false);
        this.highlightedNodeId = null;
        this.updateNodeAppearance();
        
        // Сбрасываем информацию о узле
        if (this.nodeInfo) {
            this.nodeInfo.innerHTML = `
                <h3>👤 Выберите правителя</h3>
                <p>Кликните на любой узел или найдите через поиск</p>
            `;
        }
    }
    
    highlightConnections() {
        if (!this.highlightedNodeId) {
            alert("Сначала выберите узел для выделения! Кликните на узел или найдите через поиск.");
            return;
        }
        
        console.log('Показать связи для узла:', this.highlightedNodeId);
        
        // Находим все связанные узлы
        const connectedNodeIds = new Set([this.highlightedNodeId]);
        
        // Находим предков (кто ссылается на этот узел)
        this.data.links.forEach(link => {
            if (link.target === this.highlightedNodeId) {
                connectedNodeIds.add(link.source);
            }
        });
        
        // Находим потомков (на кого ссылается этот узел)
        this.data.links.forEach(link => {
            if (link.source === this.highlightedNodeId) {
                connectedNodeIds.add(link.target);
            }
        });
        
        console.log('Связанные узлы:', Array.from(connectedNodeIds));
        
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
            if (connectedNodeIds.has(l.source) && connectedNodeIds.has(l.target)) {
                l.isHighlighted = true;
            }
        });
        
        // Обновляем отображение
        this.updateNodeAppearance();
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

// Инициализация при загрузке
window.addEventListener('load', function() {
    console.log('Страница полностью загружена');
    
    // Даем небольшую задержку для полной загрузки всех ресурсов
    setTimeout(function() {
        if (typeof ImperialVisualizer !== 'undefined') {
            console.log('Запуск визуализатора...');
            window.visualizer = new ImperialVisualizer();
        } else {
            console.error('ImperialVisualizer не определен!');
            document.getElementById('loading').innerHTML = 
                '<div style="color: #f44336; text-align: center; padding: 20px;">❌ Ошибка: визуализатор не загружен</div>';
        }
    }, 100);
});
