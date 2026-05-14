import { Link } from 'react-router-dom';
import BrandHeader from '../components/BrandHeader';

export default function PlaceholderScreen({ title, titleEn, screenNum }) {
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <BrandHeader subtitle={false} />
      <div className="surface p-8 text-center mt-8">
        <span className="font-ar-ui text-xs tracking-widest text-gold-light/70 uppercase">
          Screen 0{screenNum} · قيد الإنشاء
        </span>
        <h2 className="font-ar-body text-3xl text-cream mt-3">{title}</h2>
        <p className="font-en-display italic text-cream-60 text-lg mt-1" lang="en">
          {titleEn}
        </p>
        <p className="font-en-body text-cream-45 text-sm mt-6" lang="en">
          This screen is under construction. The visual design lives in <code className="text-gold/80">preview.html</code>.
        </p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link to="/" className="btn-outline px-5 py-2 rounded-lg text-sm">
            ← الرئيسية / Home
          </Link>
        </div>
      </div>
    </div>
  );
}
