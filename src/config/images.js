/** Image helper — serves from /public/images, respects Vite base. */
export const img = (name) => `${import.meta.env.BASE_URL}images/${name}`
