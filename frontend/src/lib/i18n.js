const STRINGS = {
  uz: { cart:"Savat", checkout:"Buyurtma berish", add:"Qo'shish", total:"Jami",
        name:"Ism", phone:"Telefon", address:"Manzil", login:"Kirish",
        password:"Parol", products:"Mahsulotlar", categories:"Kategoriyalar",
        orders:"Buyurtmalar", save:"Saqlash", price:"Narx", empty:"Bo'sh",
        order_placed:"Buyurtma qabul qilindi!", register_store:"Do'kon ro'yxati",
        order_failed:"Buyurtma yuborilmadi. Qayta urinib ko'ring." },
  ru: { cart:"Корзина", checkout:"Оформить", add:"Добавить", total:"Итого",
        name:"Имя", phone:"Телефон", address:"Адрес", login:"Вход",
        password:"Пароль", products:"Товары", categories:"Категории",
        orders:"Заказы", save:"Сохранить", price:"Цена", empty:"Пусто",
        order_placed:"Заказ принят!", register_store:"Регистрация магазина",
        order_failed:"Не удалось отправить заказ. Попробуйте снова." },
};
export function getLang() { return localStorage.getItem("language") || "uz"; }
export function setLang(l) { localStorage.setItem("language", l); }
export function t(key) { const l = getLang(); return (STRINGS[l]||STRINGS.uz)[key] || key; }
export function pname(p) { return getLang()==="ru" ? (p.name_ru||p.name_uz) : (p.name_uz||p.name_ru); }
