const filterButtons = [...document.querySelectorAll('.filter-chip')];
const filterItems = [...document.querySelectorAll('[data-categories]')];

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    filterButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    filterItems.forEach(item => {
      const categories = (item.dataset.categories || '').split(/\s+/);
      const visible = filter === 'all' || categories.includes(filter);
      item.hidden = !visible;
    });
  });
});
