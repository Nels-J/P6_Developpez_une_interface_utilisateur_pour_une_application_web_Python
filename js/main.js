document.addEventListener('DOMContentLoaded', () => {
    const fallbackImage = 'https://placehold.co/800';

    fetch('http://localhost:8001/api/v1/titles/?sort_by=-imdb_score,-votes')
        .then(response => response.json())
        .then(data => {
            console.log('Données brutes :', data);
            const bestMovie = data.results && data.results[0];
              console.log('Meilleur film :', bestMovie);
              document.getElementById('best-movie-title').textContent = bestMovie?.title || 'Titre non disponible';
              document.getElementById('best-movie-description').textContent = bestMovie?.description || 'Pas de description disponible';
              const imgUrl = bestMovie?.image_url;
              document.getElementById('best-movie-poster').src = (imgUrl && imgUrl.startsWith('https')) ? imgUrl : fallbackImage;
        })
        .catch(err => {
            console.error('Erreur fetch:', err);
              document.getElementById('best-movie-title').textContent = 'Je ne trouve pas le meilleur film pour le moment';
              document.getElementById('best-movie-description').textContent = 'Je ne trouve pas la description du film pour le moment';
              document.getElementById('best-movie-poster').src = fallbackImage;
        });
});
