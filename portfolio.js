const filterButtons = [...document.querySelectorAll('.filter-chip')];
const filterItems = [...document.querySelectorAll('[data-categories]')];
const filterStatus = document.getElementById('filterStatus');

const applyFilter = (button) => {
  const filter = button.dataset.filter || 'all';
  filterButtons.forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  let visibleCount = 0;
  filterItems.forEach(item => {
    const categories = (item.dataset.categories || '').split(/\s+/).filter(Boolean);
    const visible = filter === 'all' || categories.includes(filter);
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  if (filterStatus) filterStatus.textContent = filter === 'all'
    ? `Showing all ${visibleCount} projects.`
    : `Showing ${visibleCount} ${filter} project${visibleCount === 1 ? '' : 's'}.`;
};

filterButtons.forEach((button, index) => {
  button.addEventListener('click', () => applyFilter(button));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % filterButtons.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + filterButtons.length) % filterButtons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = filterButtons.length - 1;
    filterButtons[next].focus();
    applyFilter(filterButtons[next]);
  });
});
