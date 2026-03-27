import { useContext } from 'react'
import { LangContext } from '../App'
import enText from '../locales/en'
import zhText from '../locales/zh'

// Drop logo file at public/logo.png to enable
const LOGO = '/logo.png'

export default function Header() {
  const [lang] = useContext(LangContext)
  const text = lang === 'en' ? enText : zhText

  return (
    <div className="max-w-7xl mx-auto px-4 pt-5 pb-3 md:px-6 flex items-center gap-3">
      <img
        src={LOGO}
        alt="MOXI"
        className="h-10 w-auto"
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
      <div>
        <h1 className="font-headline font-black text-xl uppercase tracking-tight text-ink leading-none">
          {text.site_title}
        </h1>
        <p className="font-body text-[11px] text-muted tracking-widest uppercase mt-0.5">
          {text.site_subtitle}
        </p>
      </div>
    </div>
  )
}
