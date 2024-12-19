class Biblioteca {
    constructor() {
        this.libros = [];
        this.cargarLibros();
        this.inicializarEventos();
    }

    async cargarLibros() {
        // Primero intentamos cargar del localStorage
        const librosGuardados = localStorage.getItem('libros');
        
        if (librosGuardados) {
            this.libros = JSON.parse(librosGuardados);
            this.actualizarVistaLibros();
        } else {
            // Si no hay libros en localStorage, cargamos de la API
            await this.cargarLibrosDesdeAPI();
        }
    }

    async cargarLibrosDesdeAPI() {
        const contenedor = document.getElementById('catalogo-libros');
        if (contenedor) {
            contenedor.innerHTML = '<div class="loading">Cargando libros...</div>';
        }
        
        try {
            const response = await fetch('https://openlibrary.org/people/mekBot/books/want-to-read.json');
            if (!response.ok) {
                throw new Error('Error en la respuesta de la API');
            }
            const data = await response.json();
            
            // Mapear los datos de la API al formato que necesitamos
            this.libros = data.reading_log_entries.map(entry => ({
                id: entry.work.key,
                titulo: entry.work.title,
                autor: entry.work.author_names ? entry.work.author_names.join(', ') : 'Autor desconocido',
                isbn: entry.work.edition_key ? entry.work.edition_key[0] : 'ISBN no disponible',
                descripcion: `Año de publicación: ${entry.work.first_publish_year || 'No disponible'}`,
                portada: entry.work.cover_id ? 
                    `https://covers.openlibrary.org/b/id/${entry.work.cover_id}-M.jpg` : 
                    null,
                estado: Math.random() > 0.5 ? 'Disponible' : 'Prestado',
                genero: this.determinarGenero(entry.work.subjects || [])
            }));

            // Guardar en localStorage y actualizar vista
            this.guardarLibros();
            this.actualizarVistaLibros();
        } catch (error) {
            console.error('Error al cargar libros desde la API:', error);
            if (contenedor) {
                contenedor.innerHTML = '<div class="error">Error al cargar los libros. Por favor, intente más tarde.</div>';
            }
        }
    }

    determinarGenero(subjects) {
        const generos = {
            'fiction': 'ficcion',
            'fantasy': 'fantasia',
            'science': 'ciencia',
            'history': 'historia'
        };
        
        for (let subject of subjects) {
            for (let [key, value] of Object.entries(generos)) {
                if (subject.toLowerCase().includes(key)) {
                    return value;
                }
            }
        }
        return 'no-ficcion';
    }

    inicializarEventos() {
        // Solo inicializamos los eventos si estamos en la página principal
        if (document.getElementById('catalogo-libros')) {
            // Búsqueda y filtros
            const buscarInput = document.getElementById('buscar');
            const generoSelect = document.querySelector('#filtro-genero');
            const disponibilidadSelect = document.querySelector('#filtro-disponibilidad');

            const aplicarFiltros = () => {
                const termino = buscarInput ? buscarInput.value : '';
                const genero = generoSelect ? generoSelect.value : '';
                const disponibilidad = disponibilidadSelect ? disponibilidadSelect.value : '';
                this.buscarLibros(termino, genero, disponibilidad);
            };

            if (buscarInput) {
                buscarInput.addEventListener('input', aplicarFiltros);
            }

            if (generoSelect) {
                generoSelect.addEventListener('change', aplicarFiltros);
            }

            if (disponibilidadSelect) {
                disponibilidadSelect.addEventListener('change', aplicarFiltros);
            }
        }

        // Formulario de registro
        const formRegistro = document.getElementById('form-registro');
        if (formRegistro) {
            formRegistro.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registrarLibro();
            });
        }
    }

    mostrarVista(id) {
        // Añadir console.log para depuración
        console.log('Intentando mostrar vista:', id);
        
        document.querySelectorAll('.vista').forEach(vista => {
            vista.style.display = 'none';
            vista.classList.remove('activo');
        });
        
        const vistaActual = document.getElementById(id);
        if (vistaActual) {
            vistaActual.style.display = 'block';
            vistaActual.classList.add('activo');
        } else {
            console.error('No se encontró la vista:', id);
        }
    }

    registrarLibro() {
        const libro = {
            id: Date.now(),
            titulo: document.getElementById('titulo').value,
            autor: document.getElementById('autor').value,
            isbn: document.getElementById('isbn').value,
            descripcion: document.getElementById('descripcion').value
        };

        this.libros.push(libro);
        this.guardarLibros();
        this.actualizarVistaLibros();
        document.getElementById('form-registro').reset();
    }

    guardarLibros() {
        localStorage.setItem('libros', JSON.stringify(this.libros));
    }

    actualizarVistaLibros() {
        const contenedor = document.getElementById('catalogo-libros');
        if (!contenedor) {
            console.error('No se encontró el contenedor del catálogo');
            return;
        }
        
        contenedor.innerHTML = '';
        
        this.libros.forEach(libro => {
            const elemento = this.crearElementoLibro(libro);
            contenedor.appendChild(elemento);
        });
    }

    crearElementoLibro(libro) {
        const div = document.createElement('div');
        div.className = 'libro-card';
        
        const estadoClase = libro.estado === 'Disponible' ? 'disponible' : 'prestado';
        
        div.innerHTML = `
            <div class="estado ${estadoClase}">${libro.estado}</div>
            ${libro.portada ? `<img src="${libro.portada}" alt="Portada de ${libro.titulo}" class="libro-portada">` : 
            '<div class="libro-portada-placeholder"></div>'}
            <h3>${libro.titulo}</h3>
            <p><strong>Autor:</strong> ${libro.autor}</p>
            <p><strong>ISBN:</strong> ${libro.isbn}</p>
            <p>${libro.descripcion}</p>
            <button class="${libro.estado === 'Disponible' ? 'reservar' : 'prestado'}" 
                    ${libro.estado !== 'Disponible' ? 'disabled' : ''}>
                ${libro.estado === 'Disponible' ? 'Reservar' : 'Prestado'}
            </button>
        `;

        // Agregar evento al botón de reservar
        const botonReservar = div.querySelector('button');
        if (botonReservar && libro.estado === 'Disponible') {
            botonReservar.addEventListener('click', () => {
                libro.estado = 'Prestado';
                this.guardarLibros();
                this.actualizarVistaLibros();
            });
        }

        return div;
    }

    buscarLibros(termino = '', genero = '', disponibilidad = '') {
        const librosFiltrados = this.libros.filter(libro => {
            // Filtro por término de búsqueda (título o autor)
            const coincideTermino = termino === '' || 
                libro.titulo.toLowerCase().includes(termino.toLowerCase()) ||
                libro.autor.toLowerCase().includes(termino.toLowerCase());
            
            // Filtro por género
            const coincideGenero = genero === '' || libro.genero === genero;
            
            // Filtro por disponibilidad
            const coincideDisponibilidad = disponibilidad === '' || 
                libro.estado.toLowerCase() === disponibilidad.toLowerCase();
            
            return coincideTermino && coincideGenero && coincideDisponibilidad;
        });

        const contenedor = document.getElementById('catalogo-libros');
        if (!contenedor) return;
        
        contenedor.innerHTML = '';
        
        if (librosFiltrados.length === 0) {
            contenedor.innerHTML = '<div class="no-resultados">No se encontraron libros que coincidan con los criterios de búsqueda</div>';
            return;
        }
        
        librosFiltrados.forEach(libro => {
            const elemento = this.crearElementoLibro(libro);
            contenedor.appendChild(elemento);
        });
    }
}

// Inicializamos la biblioteca cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const biblioteca = new Biblioteca();
});