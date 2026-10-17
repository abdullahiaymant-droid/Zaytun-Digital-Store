export const BANK = {
  bank: "PalmPay",
  number: "8062415487",
  name: "Ayman Abdullahi Tahir",
};
export const WHATSAPP = "2348062415487";
export const waLink = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
