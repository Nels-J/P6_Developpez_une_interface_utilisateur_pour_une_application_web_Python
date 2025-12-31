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
  limit += 1 // Add 1 to exclude later the best movie to avoid duplication on display
  const endpoint = `/titles/?sort_by=-imdb_score,-votes&page_size=${limit}`;
  const data = await fetchJson(endpoint);
  return data.results.slice(1, limit); // Exclude the best movie
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


//region Rendering

/**
 * Creates an image element or a placeholder if the source is missing.
 *
 * @param {string} src - Image URL.
 * @param {string} [alt] - Alternative text.
 * @param {string} [cssClasses] - CSS classes to apply.
 * @returns {HTMLElement}
 */
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
  // string 'Poster not available' in French
  placeholder.textContent = 'Image non disponible';
  return placeholder;
}

/**
 * Renders the best movie section.
 *
 * @param {Object|null} movieDatas - Movie details object.
 * @returns {void}
 */
function renderBestMovie(movieDatas) {
  if (!DOM.bestMovie) return;
  DOM.bestMovie.innerHTML = '';
  if (!movieDatas) {
    const p = document.createElement('p');
    // string 'No movie available' in French.
    p.textContent = 'Aucun film disponible.';
    DOM.bestMovie.appendChild(p);
    return;
  }

  const img = document.createElement('img');
  img.src = movieDatas.image_url || '';
  // alt string: 'Poster of the movie ${movieDatas.title}' | 'Poster of the movie with unknown title' in French
  img.alt = movieDatas.title ? `Image de présentation du film ${movieDatas.title}` : 'Image de présentation du film au titre inconnu';
  img.className = 'img-fluid w-100 img-max-height mb-3 overflow-hidden';
  DOM.bestMovie.appendChild(img);

  const h3 = document.createElement('h3');
  h3.className = 'fw-bold text-start mb-2 overflow-hidden';
  // If title unknown string 'Title unknown' in French.
  h3.textContent = movieDatas.title || 'Titre inconnu';
  DOM.bestMovie.appendChild(h3);

  const p = document.createElement('p');
  p.className = 'text-start text-justify mb-3 mb-sm-1 overflow-hidden';
  // If description unknown string 'No description available' in French
  p.textContent = movieDatas.description || 'Aucune description disponible.';
  DOM.bestMovie.appendChild(p);

  // Details button for best movie
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

// function createCard(movie) {
//   const col = document.createElement('div');
//   col.className = 'col-6 col-md-4 mb-3';
//
//   const card = document.createElement('div');
//   card.className = 'card h-100';
//
//   const imgContainer = document.createElement('div');
//   imgContainer.className = 'd-flex justify-content-center pt-2';
//   const img = createImageHtml(movie.image_url || '', movie.title || '', 'img-max-height');
//
//   imgContainer.appendChild(img);
//
//   const body = document.createElement('div');
//   body.className = 'card-body text-center';
//
//   const title = document.createElement('h5');
//   title.className = 'card-title';
//   title.textContent = movie.title || 'Titre';
//   body.appendChild(title);
//
//   const btn = document.createElement('button');
//   btn.className = 'btn btn-sm btn-secondary details-btn'; // secondary ou light
//   btn.dataset.id = movie.id || '';
//   btn.textContent = 'Détails';
//   btn.addEventListener('click', function () {
//     const id = this.dataset.id;
//     showDetails(id);
//   });
//   body.appendChild(btn);
//
//   card.appendChild(imgContainer);
//   card.appendChild(body);
//   col.appendChild(card);
//   return col;
// }

/**
 * Render a list of movie cards up to MAX_DISPLAY into a target container.
 * @param {Array<object>} movies - Array of movie objects (expects at least ID, title, image_url).
 * @param {string} targetElement - ID of the DOM element where cards will be injected.
 * @returns {void} - Modifies the DOM directly; does not return any value.
 */
function renderSection(movies, targetElement) {
  const count = Math.min(movies.length, MAX_DISPLAY); // Ensure we don't exceed MAX_DISPLAY
  const container = document.getElementById(targetElement)

  for (let index = 0; index < count; index += 1) {
    const visibilityClasses = getResponsiveVisibilityClass(index);
    container.innerHTML += testCreateCard(movies[index], visibilityClasses);
  }
}

function renderCategorySection(container, category, movies) {
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(movies) || movies.length === 0) {
    // 'No movies for category ${category}.' in French
    container.innerHTML = `<p>Aucun film pour la catégorie ${category}.</p>`;
    return;
  }

  const count = Math.min(movies.length, MAX_DISPLAY); // Ensure we don't exceed MAX_DISPLAY
  for (let index = 0; index < count; index += 1) {
    const visibilityClasses = getResponsiveVisibilityClass(index);
    container.innerHTML += testCreateCard(movies[index], visibilityClasses);
  }
}

/**
 * Displays a modal with detailed movie information.
 *
 * @param {Object|null} details - Movie details.
 * @returns {void}
 */
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

//endregion


//region Events

/**
 * Fetches & displays movie details in a modal when "Details" button is clicked.
 * @param movieId
 * @returns {Promise<void>}
 */
async function showDetails(movieId) {
  if (!movieId) return;
  const details = await getMovieDetails(movieId);
  renderModal(details);
}

//endregion


//region Initialization

/**
 * Initializes the application by loading and rendering all sections.
 * @returns {Promise<void>}
 */
async function loadAll() {
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

  const bestMovieDatas = await getBestMovie();
  renderBestMovie(bestMovieDatas);

  const top = await getTopMovies(MAX_DISPLAY);
  renderSection(top, 'best-movies');

  const mysteryMovies = await getTopMoviesByCategory('Mystery', MAX_DISPLAY);
  renderSection(mysteryMovies, 'best-mistery')

  const thrillerMovies = await getTopMoviesByCategory('Thriller', MAX_DISPLAY);
  renderSection(thrillerMovies, 'best-thriller')

  const actionMovies = await getTopMoviesByCategory('Action', MAX_DISPLAY);
  renderSection(actionMovies, 'best-actions')

  const allGenres = await getAllGenres();
  for (let index = 0; index < allGenres.length; index += 1) {
    document.getElementById("categories").innerHTML += `<option value="${allGenres[index].name}">${allGenres[index].name}</option>`;
  }

  // Event listener for category selection
  document.getElementById("categories").addEventListener("change", function(event){
    const selectedCategory = getTopMoviesByCategory(event.target.value, MAX_DISPLAY);
    selectedCategory.then((selectedCategory) => {
        renderCategorySection(DOM.category, event.target.value, selectedCategory);
    })
  });
}

// Close modal when clicking outside of it
document.addEventListener('click', function (e) {
  if (!DOM.modal) return;
  if (!DOM.modal.classList.contains('hidden')) {
    const inside = DOM.modal.contains(e.target);
    if (!inside) {
      DOM.modal.classList.add('hidden');
    }
  }
});

// Initialize once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  loadAll().catch(function (err) { console.error('init error', err); });
});

//endregion


//region Utils

/**
 * Generates an HTML string representing a movie card.
 *
 * @param {Object} movie - Movie data used to populate the card.
 * @param {string} [visibilityClasses=''] - Optional additional CSS class(es) for the card container.
 * @returns {string} HTML markup for the movie card.
 */
function testCreateCard(movie, visibilityClasses = '') {
  const image = createImageHtml(movie.image_url)
  return `<div class="col-12 col-sm-6 col-lg-4 ${visibilityClasses}"> <!-- Card container with responsive classes -->
    <div class="imageBox"> <!-- Wrapper for image and overlay -->
      <div class="imageWrapper"> <!-- Image container -->
        ${image.outerHTML}
      </div>
      <div class="overlay">
	    <h3 class="title">${movie.title}</h3>
		<button data-id="${movie.id}" class="detailBtn btn btn-secondary rounded-pill px-4">Détails</button>
	  </div>
    </div>
  </div>`;
}

/**
 * Returns the Bootstrap visibility classes for a movie card
 * based on its position in the list.
 *
 * Visibility rules (MAX_DISPLAY = 6):
 * - Mobile (< md): show 2 cards
 * - Tablet (md): show 4 cards
 * - Desktop (lg+): show 6 cards
 *
 * @param {number} index - Zero-based index of the card in the rendered list.
 * @returns {string} Bootstrap utility classes controlling card visibility.
 */
function getResponsiveVisibilityClass(index) {
  if (index <= 1) {
    return '';
  }
  if (index <= 3) {
    return 'd-none d-lg-block d-md-block';
  }
  return 'd-none d-lg-block';
}

//endregion