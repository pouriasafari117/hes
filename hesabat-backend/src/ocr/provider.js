/* Provider مستقل OCR/AI — منطق Bulk به این ماژول وابسته نیست.
   تعویض سرویس: OCR_PROVIDER=stub|google|local */

async function extractTextFromImage(/* buffer, mime */) {
  const kind = (process.env.OCR_PROVIDER || 'stub').toLowerCase();
  if (kind === 'stub') {
    const e = new Error('پردازش تصویر به سرویس OCR متصل نیست. Provider را تنظیم کنید یا از پلن رایگان (متن) استفاده کنید.');
    e.code = 'OCR_UNAVAILABLE';
    throw e;
  }
  const e = new Error('Provider ناشناخته: ' + kind);
  e.code = 'OCR_UNKNOWN';
  throw e;
}

module.exports = { extractTextFromImage };
