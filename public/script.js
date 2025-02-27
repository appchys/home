// URL base del servidor
const BASE_URL = ''; // Usa rutas relativas

// Cargar departamentos
async function loadDepartamentos() {
    try {
        const response = await fetch(`${BASE_URL}/api/departamentos`);
        const departamentos = await response.json();
        const container = document.getElementById('departamentos-container');
        container.innerHTML = '';

        departamentos.forEach(depto => {
            const deptoJson = JSON.stringify(depto).replace(/"/g, '&quot;'); // Escapar comillas correctamente
            const card = `
                <div class="card" onclick="loadPhotos('${depto.id_home}', '${depto.descripción}', '${deptoJson}')">
                    <img src="${BASE_URL}/api/proxy-image?url=${encodeURIComponent(depto.url_foto)}" class="card-img-top" alt="${depto.descripción}">
                         class="card-img-top" alt="${depto.descripción}">
                    <div class="card-body">
                        <h5 class="card-title">${depto.descripción}</h5>
                        <p class="card-text"><strong>Precio:</strong> ${depto.precio}</p>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
    }
}

// Cargar fotos y detalles del departamento, abrir el modal
async function loadPhotos(idHome, descripcion, deptoJson) {
    try {
        const depto = JSON.parse(deptoJson);
        const response = await fetch(`${BASE_URL}/api/fotos/${idHome}`);
        const fotos = await response.json();
        const thumbnailContainer = document.getElementById('thumbnail-container');
        const largeImage = document.getElementById('large-image');
        const largeImageDesc = document.getElementById('large-image-desc');
        const detailsContainer = document.getElementById('depto-details');
        thumbnailContainer.innerHTML = '';
        detailsContainer.innerHTML = '';

        // Mostrar miniaturas
        if (fotos.length === 0) {
            thumbnailContainer.innerHTML = '<p>No hay fotos disponibles.</p>';
            largeImage.src = '';
            largeImageDesc.textContent = '';
        } else {
            fotos.forEach((foto, index) => {
                const thumbnail = `
                    <img src="${BASE_URL}/proxy-image?url=${encodeURIComponent(foto.url)}" 
                         class="thumbnail ${index === 0 ? 'active' : ''}" 
                         data-url="${foto.url}" 
                         data-desc="${foto.descripción} - ${foto.fecha}"
                         onclick="showLargeImage(this)">
                `;
                thumbnailContainer.innerHTML += thumbnail;
            });

            if (fotos.length > 0) {
                largeImage.src = `${BASE_URL}/proxy-image?url=${encodeURIComponent(fotos[0].url)}`;
                largeImageDesc.textContent = `${fotos[0].descripción} - ${fotos[0].fecha}`;
            }
        }

        // Mostrar detalles del departamento
        const contactoClean = depto.contacto.replace(/\D/g, '');
        const whatsappNumber = contactoClean.startsWith('593') ? contactoClean : `593${contactoClean}`;
        const whatsappMessage = encodeURIComponent("Hola, me gustaría más información sobre el departamento en alquiler");
        const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

        detailsContainer.innerHTML = `
            <h6>${depto.descripción}</h6>
            <p><strong>Precio:</strong> ${depto.precio}</p>
            <p><strong>Fecha:</strong> ${depto.fecha}</p>
            <p><strong>Ubicación:</strong> ${depto.ubicación}</p>
            <p><strong>Hora:</strong> ${depto.hora}</p>
            <p><strong>Contacto:</strong> ${depto.contacto}</p>
            <p><strong>Estado:</strong> ${depto.estado}</p>
            <a href="${whatsappLink}" target="_blank" class="btn btn-success btn-sm">Whatsapp</a>
        `;

        // Abrir el modal
        const modalElement = document.getElementById('photoModal');
        const modal = new bootstrap.Modal(modalElement);
        document.getElementById('photoModalLabel').textContent = `Fotos de ${descripcion}`;
        modal.show();
    } catch (error) {
        console.error('Error al cargar fotos o detalles:', error);
    }
}

// Mostrar imagen grande al hacer clic en una miniatura
function showLargeImage(thumbnail) {
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');

    const largeImage = document.getElementById('large-image');
    const largeImageDesc = document.getElementById('large-image-desc');
    largeImage.src = `${BASE_URL}/proxy-image?url=${encodeURIComponent(thumbnail.dataset.url)}`;
    largeImageDesc.textContent = thumbnail.dataset.desc;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadDepartamentos();
});