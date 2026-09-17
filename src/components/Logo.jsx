export default function Logo({ compact = false }) {
  const src = `${import.meta.env.BASE_URL}images/logo.svg`
  return (
    <span className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="مدفونة سجلماسة">
      <img
        className="logo__img"
        src={src}
        alt="شعار مدفونة سجلماسة — Depuis 2016"
        width={compact ? 42 : 50}
        height={compact ? 42 : 50}
      />
      <span className="logo__text">
        <strong>مدفونة سجلماسة</strong>
        <small className="latin">Mdfouna Sijilmassa · Depuis 2016</small>
      </span>
    </span>
  )
}
