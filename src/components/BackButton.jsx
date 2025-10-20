import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ 
  fallback = '/', 
  variant = 'default',
  size = 'default',
  className = '',
  children = 'Volver'
}) {
  const navigate = useNavigate()
  
  function goBack() {
    try { 
      if (fallback === -1) {
        navigate(-1)
      } else {
        navigate(fallback) 
      }
    } catch { 
      navigate('/') 
    }
  }

  const baseClasses = "inline-flex items-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900"
  
  const variants = {
    default: "px-4 py-2 rounded-lg border border-slate-600/60 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500 hover:shadow-lg",
    ghost: "px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50",
    minimal: "px-2 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/30",
    glass: "px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:shadow-lg",
    primary: "px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-400"
  }
  
  const sizes = {
    sm: "text-sm gap-1.5",
    default: "text-base gap-2",
    lg: "text-lg gap-2.5 px-5 py-3"
  }

  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5", 
    lg: "h-6 w-6"
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-label="Volver"
    >
      <ArrowLeft className={iconSizes[size]} />
      <span>{children}</span>
    </button>
  )
}


