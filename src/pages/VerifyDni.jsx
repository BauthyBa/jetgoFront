import Register from './Register.jsx'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

export default function VerifyDni() {
  const location = useLocation()
  const search = location.search || ''
  const params = new URLSearchParams(search)
  const mode = params.get('mode') || 'email'
  const isGoogleFlow = mode === 'google'
  const subtitle = isGoogleFlow
    ? 'Confirmá tu identidad para activar todos los beneficios después de iniciar sesión con Google.'
    : 'Completá la verificación para activar tu cuenta y acceder a todas las funcionalidades de JetGo.'

  useEffect(() => {
    document.body.classList.add('verify-dni-body')
    return () => {
      document.body.classList.remove('verify-dni-body')
    }
  }, [])

  return (
    <div className="verify-page min-h-screen px-4 py-12">
      <div className="verify-page__bg verify-page__bg--primary" aria-hidden="true" />
      <div className="verify-page__bg verify-page__bg--secondary" aria-hidden="true" />
      <div className="mx-auto w-full max-w-6xl relative">
        <div className="verify-hero animate-fade-in">
          <span className="verify-pill">Paso final</span>
          <h1 className="verify-title">Verificación de identidad</h1>
          <p className="verify-subtitle">{subtitle}</p>
          <div className="verify-highlights">
            <div className="verify-highlight">
              <span aria-hidden="true">🔒</span>
              <p>Datos cifrados y almacenados de forma segura.</p>
            </div>
            <div className="verify-highlight">
              <span aria-hidden="true">⚡</span>
              <p>Proceso guiado que podés completar en menos de 3 minutos.</p>
            </div>
            <div className="verify-highlight">
              <span aria-hidden="true">🤝</span>
              <p>Equipo de soporte disponible si necesitás ayuda.</p>
            </div>
          </div>
        </div>

        <div className="verify-grid">
          <section className="verify-info-panel animate-fade-in">
            <h2>Antes de empezar</h2>
            <p className="verify-info-panel__intro">
              Prepará todo lo necesario para que la verificación sea rápida y sin interrupciones.
            </p>
            <ul className="verify-steps">
              <li className="verify-step">
                <span className="verify-step__icon">1</span>
                <div>
                  <h3>Tené tu DNI a mano</h3>
                  <p>Vamos a pedirte una foto del frente y dorso con buena luz y sin reflejos.</p>
                </div>
              </li>
              <li className="verify-step">
                <span className="verify-step__icon">2</span>
                <div>
                  <h3>Revisá tus datos</h3>
                  <p>Completá la información personal tal como figura en tu documento.</p>
                </div>
              </li>
              <li className="verify-step">
                <span className="verify-step__icon">3</span>
                <div>
                  <h3>Confirmá y enviá</h3>
                  <p>Aceptá los términos para finalizar. Te avisamos apenas esté todo listo.</p>
                </div>
              </li>
            </ul>


            <div className="verify-support">
              <h3>¿Necesitás ayuda?</h3>
              <p>
                Escribinos a <a href="mailto:soporte@jetgo.com.ar">soporte@jetgo.com.ar</a> o chateá por{' '}
                <a href="https://wa.me/5493515306105" target="_blank" rel="noreferrer">WhatsApp</a>. Nuestro equipo responde en minutos.
              </p>
            </div>
          </section>

          <section className="embedded-register verify-card animate-fade-in">
            <header className="verify-card__header">
              <div>
                <span className="verify-card__badge">Formulario seguro</span>
                <h3>Completá tus datos</h3>
                <p>Cargá la información y el sistema hará la validación en segundos.</p>
              </div>
            </header>

            <Register embedded />

            <footer className="verify-card__footer">
              <div>
                <strong>¿Qué sigue?</strong>
                <p>Te avisaremos por correo y en la app una vez confirmada tu identidad.</p>
              </div>
              <ul>
                <li>Revisión automática inmediata</li>
                <li>Soporte prioritario si algo falla</li>
                <li>Acceso completo al ecosistema JetGo</li>
              </ul>
            </footer>
          </section>
        </div>

        <div className="verify-meta animate-fade-in">
          <div className="verify-meta__legal">
            <p>
              La verificación de identidad es obligatoria para garantizar la seguridad de la comunidad y se realiza bajo estrictos protocolos
              de confidencialidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
