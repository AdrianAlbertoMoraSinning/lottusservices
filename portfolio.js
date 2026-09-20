const filterButtons = [...document.querySelectorAll('.filter-chip')];
const filterItems = [...document.querySelectorAll('[data-categories]')];

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    filterButtons.forEach(item => item.classList.toggle('active', item === button));
    filterItems.forEach(item => {
      const categories = (item.dataset.categories || '').split(/\s+/);
      const visible = filter === 'all' || categories.includes(filter);
      item.hidden = !visible;
    });
  });
});
