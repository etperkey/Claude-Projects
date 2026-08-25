import './CategoryBadge.css';

const CATEGORY_LABELS = {
  '1': 'Cat 1',
  '2A': 'Cat 2A',
  '2B': 'Cat 2B',
  '3': 'Cat 3',
};

const CATEGORY_TOOLTIPS = {
  '1': 'Category 1: Based upon high-level evidence, there is uniform NCCN consensus',
  '2A': 'Category 2A: Based upon lower-level evidence, there is uniform NCCN consensus',
  '2B': 'Category 2B: Based upon lower-level evidence, there is NCCN consensus',
  '3': 'Category 3: Based upon any level of evidence, there is major NCCN disagreement',
};

function CategoryBadge({ category }) {
  if (!category) return null;
  const cls = `cat-${category.toLowerCase().replace(/\s/g, '')}`;

  return (
    <span className={`category-badge ${cls}`} title={CATEGORY_TOOLTIPS[category]}>
      {CATEGORY_LABELS[category] || `Cat ${category}`}
    </span>
  );
}

export default CategoryBadge;
