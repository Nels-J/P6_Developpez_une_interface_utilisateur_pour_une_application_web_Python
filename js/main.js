//region Globals

/** Base URL for the REST API */
const BASE_URL = 'http://localhost:8000/api/v1';

/** Maximum number of movies displayed per section */
const MAX_DISPLAY = 6;

//endregion


//region DOM selectors

/**
 * Cached DOM elements used across the application.
 * Helps avoid repeated DOM queries.
 */
const DOM = {
  bestMovie: document.getElementById('best-movie'),
  category: document.getElementById('category-section'),
  modal: document.getElementById('movieModal'),
};

//endregion


//region Data / API

/**
 * Performs a GET request to the API and returns the parsed JSON data.
 *
 * @param {string} endpoint - Relative API path (e.g. '/titles/?sort_by=-imdb_score').
 * @returns {Promise<Object|null>} - Parsed JSON response or null on error.
 */
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

/**
 * Retrieves the best-rated movie based on IMDb score and vote count.
 *
 * @returns {Promise<Object|null>} Full movie details or null if unavailable.
 */
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

/**
 * Retrieves top-rated movies across all categories.
 *
 * @param {number} limit - Maximum number of movies to retrieve.
 * @returns {Promise<Array<Object>>} List of movie objects.
 */
async function getTopMovies(limit) {
  limit++ // on prend un de plus pour enlever le meilleur film ensuite
  const endpoint = `/titles/?sort_by=-imdb_score,-votes&page_size=${limit}`;
  const data = await fetchJson(endpoint);
  return data.results.slice(1, limit); // on enlève le meilleur film position zéro
}

/**
 * Retrieves top-rated movies for a given category.
 *
 * @param {string} category - Movie genre.
 * @param {number} limit - Maximum number of movies.
 * @returns {Promise<Array<Object>>}
 */
async function getTopMoviesByCategory(category, limit) {
  const endpoint = `/titles/?genre=${category}&sort_by=-imdb_score,-votes&page_size=${limit}`;
  const data = await fetchJson(endpoint);
  return data.results;
}

/**
 * Retrieves movie detail on a given movie ID
 * @param movieId
 * @returns {Promise<Object|null>}
 */
async function getMovieDetails(movieId) {
  if (!movieId) return null;
  const movieData = await fetchJson(`/titles/${movieId}`);
  return movieData;
}

/**
 * Retrieves all movie genres from the API.
 * @returns {Promise<Array<Object>>} List of genre objects.
 */
async function getAllGenres() {
    const endpoint = '/genres/?page_size=25';
    const data = await fetchJson(endpoint);
    return data.results;
}

//endregion


// CONSTRUCTION
// Crée un élément image ou un placeholder si l'URL est vide
function createImageHtml(src, alt, cssClasses) {
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = cssClasses || '';
    img.style.objectFit = 'cover';
    img.setAttribute("onerror", "this.src='https://placehold.co/182x268?text=Pas+de+poster';")
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

function createCard(movie) {
  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 mb-3';

  const card = document.createElement('div');
  card.className = 'card h-100';

  const imgContainer = document.createElement('div');
  imgContainer.className = 'd-flex justify-content-center pt-2';
  const img = createImageHtml(movie.image_url || '', movie.title || '', 'img-max-height');

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


function renderSection(movies, targetElement) {
  const count = Math.min(movies.length, MAX_DISPLAY); // protection si moins d'éléments que MAX_DISPLAY
  const container = document.getElementById(targetElement)
  let cardClass = ''
  for (let i = 0; i < count; i += 1) {
    const movie = movies[i];
    if (i > 1){
      cardClass = 'd-none d-lg-block d-md-block'
    }
    if (i > 3) {
      cardClass = 'd-none d-lg-block'
    }
    const cardHTML = testCreateCard(movie, cardClass);
    container.innerHTML += cardHTML; // row.appendChild(card);
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


// OK - Affiche les détails dans la 'modal'
async function showDetails(movieId) {
  if (!movieId) return;
  const details = await getMovieDetails(movieId);
  renderModal(details);
}

//endregion


async function loadAll() {
  // Ecoute de tous les clics
  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("detailBtn")) {
      showDetails(event.target.dataset.id);
  }
    if (event.target.classList.contains("showMoreBtn")) {

      const section = event.target.parentElement.parentElement;
      toggleVisibility(section)

      const button = event.target
      toggleButtonState(button);
    }

    function toggleVisibility(section) {
      const elements = section.querySelectorAll(
          '.row [class*="d-lg-block"], .row[class*="d-md-block"]'
      );
      elements.forEach(el => el.classList.toggle("d-none"));
    }

    function toggleButtonState(button) {
      const isExpanded = button.dataset.expanded === "true"
      button.textContent = isExpanded ? "Voir plus" : "Voir moins";
      button.dataset.expanded = String(!isExpanded);
    }
  });


  // OK - Meilleur film
  const bestMovieDatas = await getBestMovie();
  renderBestMovie(bestMovieDatas);

  // Top6 films
  const top = await getTopMovies(MAX_DISPLAY);
  renderSection(top, 'best-movies');

  //Catégories
  const mysteryMovies = await getTopMoviesByCategory('Mystery', MAX_DISPLAY);
  // renderCategorySection(DOM.mystery, 'Mystery', mysteryMovies);
  renderSection(mysteryMovies, 'best-mistery')

  const thrillerMovies = await getTopMoviesByCategory('Thriller', MAX_DISPLAY);
  // renderCategorySection(DOM.thriller, 'Thriller', thrillerMovies);
  renderSection(thrillerMovies, 'best-thriller')

  const actionMovies = await getTopMoviesByCategory('Action', MAX_DISPLAY);
  // renderCategorySection(DOM.action, 'Action', actionMovies);
  renderSection(actionMovies, 'best-actions')

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



//region Utils
function testCreateCard(movie, cardClass = '') {
  const image = createImageHtml(movie.image_url)
  return `<div class="col-12 col-sm-6 col-lg-4 ${cardClass}"> <!-- 12 pour mobile, 6 pour tablettes, 4 pour desktop -->
    <div class="imageBox"> <!-- Ajout d'une div englobante pour le style -->
      <div class="imageWrapper"> <!-- Ajout d'une div pour gérer le ratio -->
        ${image.outerHTML}
         
<!--        <img src="${movie.image_url}" alt="Image 1"/>-->
        <!-- injecter ici via JS les éléments provenant de l'API pour les top films -->
      </div>
      <div class="overlay">
	    <h3 class="title">${movie.title}</h3>
		<button data-id="${movie.id}" class="detailBtn btn btn-secondary rounded-pill px-4">Détails</button>
	  </div>
    </div>
  </div>`;
}

//endregion