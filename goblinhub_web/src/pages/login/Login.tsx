
import { useState } from "react"
import "./Login.css"
import logo from '../../components/logo/logo.png'

const Login: React.FC = () => {
    const [forgotPassword, setForgotPassword] = useState(false)

    return (
        <div className="base">
            <div className='logo'>
                {forgotPassword && (
                    <span
                        className="volver"
                        onClick={() => setForgotPassword(false)}
                    >
                        ← Volver al login
                    </span>
                )}
                <img src={logo} alt="goblin" className="goblin" />
            </div>

            {!forgotPassword ? (
                // ——— VISTA LOGIN ———
                <div className='form'>
                    <label className="inicio">Iniciar sesión</label>
                    <input type="text" placeholder="Correo electrónico" />
                    <input type="password" placeholder="Contraseña" />
                    <span
                        className="contraseña"
                        onClick={() => setForgotPassword(true)}
                    >
                        ¿Olvidaste tu contraseña?
                    </span>
                    <button className="entrar">Entrar</button>
                    <p>¿No tienes una cuenta?</p>
                    <a href="/register">Regístrate aquí</a>
                </div>
            ) : (
                // ——— VISTA RECUPERAR CONTRASEÑA ———
                <div className='form'>
                    <label className="inicio">Recuperar Contraseña</label>
                    <label className="instrucciones">Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.</label>
                    <input type="text" placeholder="Correo electrónico" />
                    <div className="botones">
                        <button className="entrar">Enviar Código</button>
                        <button className="cancelar" onClick={() => setForgotPassword(false)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Login;