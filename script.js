const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3KzszjN0pP2NVNYGqhBLAl_YzWvvsukh1nSZbaf5nTF8NS_EP12DbwCkEDB5uEgeGWA/exec';
let cachePrendas = [];
let cacheCategorias = [];

function convertirImagenMiniatura(url) {
    if (!url) return '';
    if (url.includes('thumbnail?id=')) return url;
    const matches = url.match(/[-\w]{25,}/);
    return matches ? `https://drive.google.com/thumbnail?id=${matches[0]}&sz=100` : url;
}

function changeTab(tabId) {
    document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active-tab'));
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active-panel'));
    
    if(tabId === 'registro') {
        document.querySelector('.segmented-control button:nth-child(1)').classList.add('active-tab');
        document.getElementById('panel-registro').classList.add('active-panel');
    } else if(tabId === 'stock') {
        document.querySelector('.segmented-control button:nth-child(2)').classList.add('active-tab');
        document.getElementById('panel-stock').classList.add('active-panel');
        cargarDatosBase();
    } else {
        document.querySelector('.segmented-control button:nth-child(3)').classList.add('active-tab');
        document.getElementById('panel-config-cat').classList.add('active-panel');
        cargarDatosBase();
    }
}

function vincularManejoImagenes(input, preview, dataStore, typeStore, nameStore) {
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                preview.src = evt.target.result; preview.style.display = 'block';
                dataStore.value = evt.target.result.split(',')[1];
                typeStore.value = file.type; nameStore.value = file.name;
            };
            reader.readAsDataURL(file);
        }
    });
}
vincularManejoImagenes(document.getElementById('fileInput'), document.getElementById('imagePreview'), document.getElementById('imageData'), document.getElementById('imageType'), document.getElementById('imageName'));
vincularManejoImagenes(document.getElementById('cameraInput'), document.getElementById('imagePreview'), document.getElementById('imageData'), document.getElementById('imageType'), document.getElementById('imageName'));
vincularManejoImagenes(document.getElementById('editFileInput'), document.getElementById('editImagePreview'), document.getElementById('editImageData'), document.getElementById('editImageType'), document.getElementById('editImageName'));
vincularManejoImagenes(document.getElementById('editCameraInput'), document.getElementById('editImagePreview'), document.getElementById('editImageData'), document.getElementById('editImageType'), document.getElementById('editImageName'));

function cargarDatosBase() {
    const tbody = document.getElementById('tablaStockBody'); const label = document.getElementById('stockLoadingLabel');
    label.style.display = 'block';

    fetch(APPS_SCRIPT_URL)
    .then(res => res.json())
    .then(res => {
        label.style.display = 'none';
        if (res.status === "éxito") {
            cachePrendas = res.datos;
            cacheCategorias = res.categorias;
            
            actualizarDropdownsCategorias();
            dibujarTablaStock(cachePrendas);
            dibujarListaConfigCategorias();
        }
    })
    .catch(err => { label.style.display = 'none'; console.error(err); });
}

function actualizarDropdownsCategorias() {
    const selectReg = document.getElementById('categoria');
    const selectEdit = document.getElementById('editCategoria');
    const selectFilter = document.getElementById('filterCategoria');
    
    const valReg = selectReg.value; const valEdit = selectEdit.value; const valFilter = selectFilter.value;

    selectReg.innerHTML = cacheCategorias.map(c => `<option value="${c}">${c}</option>`).join('');
    selectEdit.innerHTML = cacheCategorias.map(c => `<option value="${c}">${c}</option>`).join('');
    selectFilter.innerHTML = '<option value="">Todas</option>' + cacheCategorias.map(c => `<option value="${c}">${c}</option>`).join('');
    
    if(valReg) selectReg.value = valReg;
    if(valEdit) selectEdit.value = valEdit;
    if(valFilter) selectFilter.value = valFilter;
}

function dibujarTablaStock(lista) {
    const tbody = document.getElementById('tablaStockBody'); tbody.innerHTML = '';
    if(lista.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--ios-secondary-text);">Sin coincidencias.</td></tr>'; return; }

    lista.forEach(prod => {
        const tr = document.createElement('tr');
        const cS = (v) => v == 0 ? 'badge-zero' : 'badge-active';
        const indexOrig = cachePrendas.findIndex(item => item.rowNumber === prod.rowNumber);
        
        tr.innerHTML = `
            <td><a href="${prod.imagen}" target="_blank"><img class="img-table-thumb" src="${convertirImagenMiniatura(prod.imagen)}" onerror="this.src='https://placehold.co/36x36?text=Foto'"></a></td>
            <td class="cell-left" style="font-weight:600; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${prod.nombre}<br><span style="font-size:11px; color:var(--ios-secondary-text); font-weight:normal;">${prod.categoria || 'S/C'}</span></td>
            <td class="${cS(prod.tallaS)}">${prod.tallaS}</td>
            <td class="${cS(prod.tallaM)}">${prod.tallaM}</td>
            <td class="${cS(prod.tallaL)}">${prod.tallaL}</td>
            <td class="${cS(prod.tallaXL)}">${prod.tallaXL}</td>
            <td><button class="btn-row-edit" onclick="launchEditModal(${indexOrig})">Editar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function ejecutarBusquedaCombinada() {
    const busqueda = document.getElementById('searchBar').value.toLowerCase().trim();
    const filtroCat = document.getElementById('filterCategoria').value;

    const filtrados = cachePrendas.filter(prenda => {
        const coincideNombre = prenda.nombre.toLowerCase().includes(busqueda);
        const coincideCat = (filtroCat === "") || (prenda.categoria === filtroCat);
        return coincideNombre && coincideCat;
    });
    dibujarTablaStock(filtrados);
}

function dibujarListaConfigCategorias() {
    const contenedor = document.getElementById('listaCategoriasContenedor');
    contenedor.innerHTML = cacheCategorias.map(cat => `
        <div class="category-item">
            <span><strong>${cat}</strong></span>
            <button class="btn-cat-edit" onclick="editarCategoriaMadre('${cat}')">Editar</button>
        </div>
    `).join('');
}

function agregarNuevaCategoriaServidor() {
    const input = document.getElementById('newCatInput'); const valor = input.value.trim();
    if(!valor) return;
    
    fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "agregar_categoria", nuevaCategoria: valor }) })
    .then(() => { input.value = ''; cargarDatosBase(); });
}

function editarCategoriaMadre(oldCat) {
    const nuevoNombre = prompt(`Cambiar nombre de "${oldCat}" por:`, oldCat);
    if (!nuevoNombre || nuevoNombre.trim() === "" || nuevoNombre.trim() === oldCat) return;

    const msg = document.getElementById('catMensaje');
    msg.textContent = "Sincronizando categorías..."; msg.className = "banner-alert alert-success"; msg.style.display = "block";

    fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "editar_categoria", oldCategoria: oldCat, newCategoria: nuevoNombre.trim() }) })
    .then(res => res.json())
    .then(res => { if(res.status === "éxito") cargarDatosBase(); })
    .finally(() => msg.style.display = 'none');
}

document.getElementById('formNuevo').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!document.getElementById('imageData').value) { alert('Por favor, selecciona una foto.'); return; }
    const btn = document.getElementById('btnSubmit'); const msg = document.getElementById('mensaje');
    btn.disabled = true; msg.style.display = 'none';

    const datos = {
        action: "registrar",
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        imageData: document.getElementById('imageData').value,
        imageType: document.getElementById('imageType').value,
        imageName: document.getElementById('imageName').value,
        tallaS: document.getElementById('tallaS').value,
        tallaM: document.getElementById('tallaM').value,
        tallaL: document.getElementById('tallaL').value,
        tallaXL: document.getElementById('tallaXL').value
    };

    fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
    .then(() => {
        msg.textContent = "Guardado con éxito."; msg.className = "banner-alert alert-success"; msg.style.display = "block";
        document.getElementById('formNuevo').reset(); document.getElementById('imagePreview').style.display = 'none';
        ['tallaS', 'tallaM', 'tallaL', 'tallaXL'].forEach(id => document.getElementById(id).value = 0);
    })
    .finally(() => { btn.disabled = false; setTimeout(() => msg.style.display = 'none', 3000); });
});

function launchEditModal(index) {
    const prenda = cachePrendas[index];
    document.getElementById('editMensaje').style.display = 'none';
    document.getElementById('editRowNum').value = prenda.rowNumber;
    document.getElementById('editNombre').value = prenda.nombre;
    
    actualizarDropdownsCategorias();
    document.getElementById('editCategoria').value = prenda.categoria;

    document.getElementById('editTallaS').value = prenda.tallaS;
    document.getElementById('editTallaM').value = prenda.tallaM;
    document.getElementById('editTallaL').value = prenda.tallaL;
    document.getElementById('editTallaXL').value = prenda.tallaXL;
    
    document.getElementById('editImageData').value = '';
    document.getElementById('editImagePreview').style.display = 'none';
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() { document.getElementById('editModal').style.display = 'none'; }

document.getElementById('formEdit').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveEdit'); const msg = document.getElementById('editMensaje');
    btn.disabled = true; msg.style.display = 'none';

    const datos = {
        action: "editar",
        rowNumber: document.getElementById('editRowNum').value,
        nombre: document.getElementById('editNombre').value,
        categoria: document.getElementById('editCategoria').value,
        tallaS: document.getElementById('editTallaS').value,
        tallaM: document.getElementById('editTallaM').value,
        tallaL: document.getElementById('editTallaL').value,
        tallaXL: document.getElementById('editTallaXL').value
    };

    const nuevaImg = document.getElementById('editImageData').value;
    if (nuevaImg && nuevaImg.trim() !== "") {
        datos.imageData = nuevaImg;
        datos.imageType = document.getElementById('editImageType').value;
        datos.imageName = document.getElementById('editImageName').value;
    }

    fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
    .then(res => res.json())
    .then(res => {
        if (res.status === "éxito") {
            msg.textContent = "Cambios guardados."; msg.className = "banner-alert alert-success"; msg.style.display = "block";
            setTimeout(() => { closeModal(); cargarDatosBase(); }, 1200);
        } else { throw new Error(res.mensaje); }
    })
    .catch(() => {
        msg.textContent = "Error al guardar."; msg.className = "banner-alert alert-error"; msg.style.display = "block";
    })
    .finally(() => btn.disabled = false);
});

window.onload = cargarDatosBase;
