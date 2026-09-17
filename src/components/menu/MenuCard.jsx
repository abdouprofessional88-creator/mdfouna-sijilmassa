import { categoryLabel, groupsForProduct, modeLabel } from '../../data/menu.js'
import { useCart } from '../../cart/CartContext.jsx'
import SafeImage from '../SafeImage.jsx'

export default function MenuCard({ product, onOpen }) {
  const { add, setOpen } = useCart()
  const traditional = ['madfouna', 'tanjia', 'rfissa', 'marocaine'].includes(product.cat)

  const quickAdd = () => {
    if (!product.available) return
    if (!Number(String(product.dbId || product.id).replace(/^db-/, ''))) {
      onOpen(product, true)
      return
    }
    const groups = groupsForProduct(product)
    // If customization is required, open details instead of guessing
    if (groups.some((g) => g.is_required)) {
      onOpen(product, true)
      return
    }
    add({
      productId: product.dbId || product.id,
      name: product.name, latin: product.latin, image: product.image,
      basePrice: Number(product.price), qty: 1, options: [], note: '',
    })
    setOpen(true)
  }

  return (
    <article className={`mcard ${traditional ? 'mcard--heritage' : ''} ${!product.available ? 'is-off' : ''}`}>
      <button className="mcard__media" onClick={() => onOpen(product)} aria-label={`تفاصيل ${product.name}`}>
        <SafeImage
          real={product.image.real}
          src={product.image.src}
          fallback={product.image.fallback}
          alt={product.name}
          loading="lazy"
        />
        <span className="mcard__zoom" aria-hidden="true">عرض التفاصيل ←</span>
        {product.badge && <span className="mcard__badge">{product.badge}</span>}
        {(product.availability_mode || 'all_day') !== 'all_day' && product.available && (
          <span className="mcard__mode">{modeLabel(product.availability_mode)}</span>
        )}
        {product.image.approx && !product.image.real && <span className="mcard__approx">صورة تقريبية</span>}
        {!product.available && <span className="mcard__off">غير متوفر حالياً</span>}
      </button>
      <div className="mcard__body">
        <p className="mcard__cat">{categoryLabel(product.cat)} · <span className="latin">{product.latin}</span></p>
        <h3>{product.name}</h3>
        <p className="mcard__desc">{product.desc}</p>
        <div className="mcard__foot">
          <span className="mcard__price">
            {product.price} درهم <small>تجريبي</small>
          </span>
          <div className="mcard__actions">
            <button className="mcard__btn" onClick={() => onOpen(product)}>
              التفاصيل
            </button>
            <button className="mcard__add" onClick={quickAdd} disabled={!product.available}
              title={product.available ? 'أضف إلى السلة' : 'غير متوفر'}>
              + سلة
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
