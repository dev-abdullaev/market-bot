// Minimal RU/UZ dictionary ported from the legacy frontend and extended with
// strings for the new auth / checkout / webapp screens. Default language: UZ.
const STRINGS = {
  uz: {
    cart: "Savat",
    checkout: "Buyurtma berish",
    add: "Qo'shish",
    total: "Jami",
    name: "Ism",
    phone: "Telefon",
    address: "Manzil",
    login: "Kirish",
    password: "Parol",
    products: "Mahsulotlar",
    categories: "Kategoriyalar",
    orders: "Buyurtmalar",
    save: "Saqlash",
    price: "Narx",
    empty: "Bo'sh",
    order_placed: "Buyurtma qabul qilindi!",
    register_store: "Do'kon ro'yxati",
    order_failed: "Buyurtma yuborilmadi. Qayta urinib ko'ring.",
    dashboard: "Boshqaruv paneli",
    logout: "Chiqish",
    qty: "Soni",
    delete: "O'chirish",
    saved: "Saqlandi",
    panel: "Operator paneli",
    // --- new screens ---
    login_failed: "Login yoki parol xato",
    loading: "Yuklanmoqda…",
    cart_empty: "Savat bo'sh",
    cart_empty_hint: "Mahsulotlarni tanlab, savatga qo'shing.",
    continue_shopping: "Xaridni boshlash",
    order_summary: "Buyurtma tafsilotlari",
    place_order: "Buyurtmani tasdiqlash",
    customer_info: "Mijoz ma'lumotlari",
    address_optional: "Manzil (ixtiyoriy)",
    back: "Orqaga",
    store_name: "Do'kon nomi",
    activity_type: "Faoliyat turi",
    location: "Lokatsiya",
    location_set: "Lokatsiya belgilandi",
    get_location: "Joriy lokatsiyani olish",
    store_created: "Do'kon yaratildi",
    product: "Mahsulot",
    new_product: "Yangi mahsulot",
    edit_product: "Mahsulotni tahrirlash",
    name_ru: "Nomi (RU)",
    name_uz: "Nomi (UZ)",
    unit: "O'lchov birligi",
    photo: "Rasm",
    in_stock: "Mavjud",
    is_hidden: "Yashirish",
    no_category: "Kategoriyasiz",
    error: "Xatolik yuz berdi",
    required: "Majburiy maydon",
  },
  ru: {
    cart: "Корзина",
    checkout: "Оформить",
    add: "Добавить",
    total: "Итого",
    name: "Имя",
    phone: "Телефон",
    address: "Адрес",
    login: "Вход",
    password: "Пароль",
    products: "Товары",
    categories: "Категории",
    orders: "Заказы",
    save: "Сохранить",
    price: "Цена",
    empty: "Пусто",
    order_placed: "Заказ принят!",
    register_store: "Регистрация магазина",
    order_failed: "Не удалось отправить заказ. Попробуйте снова.",
    dashboard: "Дашборд",
    logout: "Выход",
    qty: "Кол-во",
    delete: "Удалить",
    saved: "Сохранено",
    panel: "Панель оператора",
    // --- new screens ---
    login_failed: "Неверный логин или пароль",
    loading: "Загрузка…",
    cart_empty: "Корзина пуста",
    cart_empty_hint: "Выберите товары и добавьте в корзину.",
    continue_shopping: "Начать покупки",
    order_summary: "Детали заказа",
    place_order: "Подтвердить заказ",
    customer_info: "Данные клиента",
    address_optional: "Адрес (необязательно)",
    back: "Назад",
    store_name: "Название магазина",
    activity_type: "Тип деятельности",
    location: "Локация",
    location_set: "Локация указана",
    get_location: "Определить местоположение",
    store_created: "Магазин создан",
    product: "Товар",
    new_product: "Новый товар",
    edit_product: "Редактировать товар",
    name_ru: "Название (RU)",
    name_uz: "Название (UZ)",
    unit: "Единица измерения",
    photo: "Фото",
    in_stock: "В наличии",
    is_hidden: "Скрыть",
    no_category: "Без категории",
    error: "Произошла ошибка",
    required: "Обязательное поле",
  },
};

export function getLang() {
  return localStorage.getItem("language") || "uz";
}
export function setLang(l) {
  localStorage.setItem("language", l);
}
export function t(key) {
  const l = getLang();
  return (STRINGS[l] || STRINGS.uz)[key] || key;
}
/** Localised product name honouring the chosen language. */
export function pname(p) {
  if (!p) return "";
  return getLang() === "ru"
    ? p.name_ru || p.name_uz || ""
    : p.name_uz || p.name_ru || "";
}
