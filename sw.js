self.addEventLis stener('fetch', function(event) {
  // Apenas deixa a internet passar livremente, sem atrapalhar as atualizações do seu site
  event.respondWith(fetch(event.request));
});
