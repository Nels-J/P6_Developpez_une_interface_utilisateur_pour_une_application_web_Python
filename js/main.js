const BASE_URL = 'http://localhost:8000/api/v1';
const MAX_DISPLAY = 6;

// OK - Récupération des éléments du DOM
const DOM = {
  bestMovie: document.getElementById('best-movie'),
  mystery: document.getElementById('mistery'),
  thriller: document.getElementById('thriller'),
  action: document.getElementById('action'),
  category: document.getElementById('category-section'),
  modal: document.getElementById('bestMovieModal'),
};

// OK - fetch utilitaire et pour gérer les erreurs
async function fetchJson(endpoint) {
  const url = BASE_URL + endpoint;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('fetchJson error:', err);
    return null;
  }
}

// OK - récupère le json du meilleur film et son détail
async function getBestMovie() {
  const data = await fetchJson('/titles/?sort_by=-imdb_score,-votes&limit=1');
  if (!data) {
    return null;
  }
  if (Array.isArray(data)) {
    if (data.length > 0) return data[0];
    return null;
  }
  if (!data.results) {
    return null;
  }

  const movieId = data.results[0].id;
  const movieData = await getMovieDetails(movieId);
  return movieData;
}

// OK - récupère le json des 6 meilleurs films toute catégories.
async function getTopMovies(limit) {
  limit++ // on prend un de plus pour enlever le meilleur film ensuite
  const endpoint = `/titles/?sort_by=-imdb_score,-votes&page_size=${limit}`;
  const data = await fetchJson(endpoint);
  return data.results.slice(1, limit); // on enlève le meilleur film position zéro
}

// OK - 6 meilleurs films d'une catégorie.
async function getTopMoviesByCategory(category, limit) {
  const endpoint = `/titles/?genre=${category}&sort_by=-imdb_score,-votes&page_size=${limit}`;
  const data = await fetchJson(endpoint);
  return data.results;
}

// OK - ajout de l'ID au endpoint titles/ pour obtenir + de détails
async function getMovieDetails(movieId) {
  if (!movieId) return null;
  const movieData = await fetchJson(`/titles/${movieId}`);
  return movieData;
}

// Crée un élément image ou un placeholder si l'URL est vide
function createImageHtml(src, alt, cssClasses) {
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = cssClasses || '';
    img.style.objectFit = 'cover';
    // si erreur de chargement de l'image, on met une image par défaut
    // img.onerror = function () { this.src = 'assets/Placeholder.svg'; };
    // img.onerror = "this.src='assets/Placholder.svg';";
    img.setAttribute("onerror", "this.src='assets/Placholder.svg';" )
    return img;
  }
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-secondary text-white d-flex align-items-center justify-content-center';
  placeholder.textContent = 'Image non disponible';
  return placeholder;
}

// OK - L'affichage du meilleur film
function renderBestMovie(movieDatas) {
  if (!DOM.bestMovie) return;
  DOM.bestMovie.innerHTML = '';
  if (!movieDatas) {
    const p = document.createElement('p');
    p.textContent = 'Aucun film disponible.';
    DOM.bestMovie.appendChild(p);
    return;
  }

  const img = document.createElement('img');
  img.src = movieDatas.image_url || '';
  img.alt = movieDatas.title ? `Image de présentation du film ${movieDatas.title}` : 'Image de présentation';
  img.className = 'img-fluid w-100 img-max-height mb-3 overflow-hidden';
  DOM.bestMovie.appendChild(img);

  const h3 = document.createElement('h3');
  h3.className = 'fw-bold text-start mb-2 overflow-hidden';
  h3.textContent = movieDatas.title || 'Titre inconnu';
  DOM.bestMovie.appendChild(h3);

  const p = document.createElement('p');
  p.className = 'text-start text-justify mb-3 mb-sm-1 overflow-hidden';
  p.textContent = movieDatas.description || 'Aucune description disponible.';
  DOM.bestMovie.appendChild(p);

  // Bouton Détails
  const divBtn = document.createElement('div');
  divBtn.className = 'text-center text-sm-end overflow-hidden';

  const btn = document.createElement('button');
  btn.className = 'btn btn-danger rounded-pill px-4';
  btn.dataset.id = movieDatas.id || '';
  btn.textContent = 'Détails';

  btn.addEventListener('click', function () {
    const id = this.dataset.id;
    showDetails(id);
  });

  divBtn.appendChild(btn);
  DOM.bestMovie.appendChild(divBtn);
}

// todo: A REMPLACER PAR MON HTML
function createCard(movie) {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 mb-3';

  const card = document.createElement('div');
  card.className = 'card h-100';

  const imgContainer = document.createElement('div');
  imgContainer.className = 'd-flex justify-content-center pt-2';
  const img = createImageHtml(movie.image_url || '', movie.title || '', 'img-max-height');
  // img.onerror(() => {
  //  img.src="https://upload.wikimedia.org/wikipedia/commons/c/cd/Placeholder_male_superhero_c.png";
  // });

  imgContainer.appendChild(img);

  const body = document.createElement('div');
  body.className = 'card-body text-center';

  const title = document.createElement('h5');
  title.className = 'card-title';
  title.textContent = movie.title || 'Titre';
  body.appendChild(title);

  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-secondary details-btn'; // secondary ou light
  btn.dataset.id = movie.id || '';
  btn.textContent = 'Détails';
  btn.addEventListener('click', function () {
    const id = this.dataset.id;
    showDetails(id);
  });
  body.appendChild(btn);

  card.appendChild(imgContainer);
  card.appendChild(body);
  col.appendChild(card);
  return col;
}


function renderTopMovies(movies) {
  const containerId = 'top-global';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('section');
    container.id = containerId;
    const h2 = document.createElement('h2');
    h2.textContent = 'Film les mieux notés';
    container.appendChild(h2);
    const row = document.createElement('div');
    row.className = 'row';
    row.id = containerId + '-row';
    container.appendChild(row);
    const main = document.querySelector('main');
    if (main) main.insertBefore(container, DOM.mystery ? DOM.mystery.parentElement : null);
  }

  const row = document.getElementById(containerId + '-row');
  row.innerHTML = '';

  if (!Array.isArray(movies) || movies.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Aucun film dans les mieux notés.';
    row.appendChild(p);
    return;
  }

  const count = Math.min(movies.length, MAX_DISPLAY);
  for (let i = 0; i < count; i += 1) {
    const movie = movies[i];
    const cardHTML = testCreateCard(movie);
    row.innerHTML += cardHTML; // row.appendChild(card);
  }
}


function renderCategorySection(targetElement, titleText, movies) {
  if (!targetElement) return;
  targetElement.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'border border-dark p-3 mb-4';

  const h3 = document.createElement('h3');
  h3.textContent = titleText || 'Catégorie';
  container.appendChild(h3);

  const row = document.createElement('div');
  row.className = 'row';
  container.appendChild(row);

  if (!Array.isArray(movies) || movies.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Aucun film pour cette catégorie.';
    container.appendChild(p);
    targetElement.appendChild(container);
    return;
  }

  const count = Math.min(movies.length, MAX_DISPLAY);
  for (let i = 0; i < count; i += 1) {
    const movie = movies[i];
    const card = createCard(movie);
    row.appendChild(card);
  }

  targetElement.appendChild(container);
}


// fixme: le visuel n'est pas encore correct revoir le css le copier coller du poc bootstrap demande des ajustements.
function renderModal(details) {
  if (!DOM.modal) return;
  DOM.modal.innerHTML = '';
  if (!details) {
    DOM.modal.classList.add('hidden');
    return;
  }

  DOM.modal.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body">
          <div class="content-wrapper d-flex flex-column flex-md-row gap-3">
            <div class="text-section flex-fill">
              <h5>${details.title || 'Titre inconnu'}</h5>
              <h6 class="text-muted">${details.year || ''}</h6>
              <p><strong>Genres:</strong> ${(details.genres || []).join(', ')}</p>
              <p><strong>Réalisateur(s):</strong> ${(details.directors || []).join(', ')}</p>
              <p><strong>Acteurs:</strong> ${(details.actors || []).join(', ')}</p>
            </div>
            <div class="image-section flex-fill text-center">
              <img src="${details.image_url || ''}" alt="${details.title || ''}" class="img-fluid rounded mb-2" style="max-height:300px;object-fit:cover;">
            </div>
          </div>
          <div class="mt-4">
            <p>${details.description || details.long_description || ''}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger" id="closeModalBtn">Fermer</button>
        </div>
      </div>
    </div>
  `;

  const closeBtn = DOM.modal.querySelector('#closeModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      DOM.modal.classList.add('hidden');
    });
  }
  DOM.modal.classList.remove('hidden');
}


// OK - Affiche les détails dans la modal
async function showDetails(movieId) {
  if (!movieId) return;
  const details = await getMovieDetails(movieId);
  renderModal(details);
}

async function getAllGenres() {
    const endpoint = '/genres/?page_size=25';
    const data = await fetchJson(endpoint);
    return data.results;
}

// fixme: loadAll doit être revu une fois l'affichage des sections corrigées
async function loadAll() {
  // OK - Meilleur film
  const bestMovieDatas = await getBestMovie();
  renderBestMovie(bestMovieDatas);

  // Top6 films
  const top = await getTopMovies(MAX_DISPLAY);
  renderTopMovies(top);

  //Catégories
  const mysteryMovies = await getTopMoviesByCategory('Mystery', MAX_DISPLAY);
  renderCategorySection(DOM.mystery, 'Mystery', mysteryMovies);

  const thrillerMovies = await getTopMoviesByCategory('Thriller', MAX_DISPLAY);
  renderCategorySection(DOM.thriller, 'Thriller', thrillerMovies);

  const actionMovies = await getTopMoviesByCategory('Action', MAX_DISPLAY);
  renderCategorySection(DOM.action, 'Action', actionMovies);

  const allGenres = await getAllGenres();
  for (i=0; i < allGenres.length; i++){
    document.getElementById("categories").innerHTML += `<option value="${allGenres[i].name}">${allGenres[i].name}</option>`;
  }

  // on event change log name
  document.getElementById("categories").addEventListener("change", function(event){
    const selectedCategory = getTopMoviesByCategory(event.target.value, MAX_DISPLAY);
    selectedCategory.then((selectedCategory) => {
        renderCategorySection(DOM.category, '', selectedCategory);
    })
    // console.log(selectedCategory);
    // renderCategorySection(DOM.action, '', selectedCategory);
  });
}


document.addEventListener('click', function (e) {
  if (!DOM.modal) return;
  if (!DOM.modal.classList.contains('hidden')) {
    const inside = DOM.modal.contains(e.target);
    if (!inside) {
      DOM.modal.classList.add('hidden');
    }
  }
});


// OK - Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
  loadAll().catch(function (err) { console.error('init error', err); });
});


function testCreateCard(movie) {
  const image = createImageHtml(movie.image_url)
  return `<div className="col-12 col-sm-6 col-lg-4"> <!-- 12 pour mobile, 6 pour tablettes, 4 pour desktop -->
    <div className="imageBox"> <!-- Ajout d'une div englobante pour le style -->
      <div className="imageWrapper"> <!-- Ajout d'une div pour gérer le ratio -->
        ${image.outerHTML}
         
<!--        <img src="${movie.image_url}" alt="Image 1"/>-->
        <!-- injecter ici via JS les éléments provenant de l'API pour les top films -->
      </div>
      <h3>${movie.title}</h3>
    </div>
  </div>`;
}