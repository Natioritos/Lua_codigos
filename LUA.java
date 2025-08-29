<script>
  // Seleciona todos os links (<a>), botões (<button>) e elementos com a classe 'interactive'
  const interactiveElements = document.querySelectorAll('a, button, .interactive');

  // Adiciona o som de clique a cada elemento interativo
  interactiveElements.forEach(element => {
    element.addEventListener('click', (e) => {
      e.preventDefault(); // Previne a navegação imediata (para links)

      // Reproduz o som
      const clickSound = new Audio('estrelanova.mp3');
      clickSound.volume = 0.5; // Ajusta o volume (opcional)
      clickSound.play().then(() => {
        // Aguarda 500ms (meio segundo) antes de redirecionar (apenas para links)
        if (element.tagName === 'A') {
          setTimeout(() => {
            window.location.href = element.href;
          }, 500); // Ajuste o tempo conforme necessário
        }
      }).catch(err => console.warn('Erro ao reproduzir som:', err));
    });
  });
</script>