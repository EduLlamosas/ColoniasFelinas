import { Link } from "react-router-dom";

const CONTACTO_EMAIL = "hola@coloniasfelinas.com";

const CARACTERISTICAS = [
	{
		titulo: "Censo de colonias y gatos",
		descripcion:
			"Cada colonia en el mapa, con su ficha de gatos censados: sexo, capa, estado CER (Captura-Esterilización-Retorno) y microchip cuando lo tenga.",
	},
	{
		titulo: "Historial clínico por gato",
		descripcion:
			"Esterilizaciones, vacunaciones y tratamientos, con fecha y diagnóstico. El estado CER del gato se actualiza solo al registrar la intervención.",
	},
	{
		titulo: "Comederos y visitas de campo",
		descripcion:
			"Quién revisó cada comedero y cuándo, incluso sin cobertura: la app funciona sin conexión y sincroniza sola al recuperarla.",
	},
	{
		titulo: "Voluntariado organizado",
		descripcion:
			"Qué voluntario atiende cada colonia y con qué rol, sin depender de una hoja de cálculo que nadie mantiene al día.",
	},
	{
		titulo: "Estadísticas para memoria y trámites",
		descripcion:
			"Esterilizaciones del trimestre, comederos sin visitar, censo por estado - los números que pide una memoria anual, ya calculados.",
	},
	{
		titulo: "Un panel por ayuntamiento",
		descripcion:
			"Cada organización ve solo sus propios datos, aislados a nivel de base de datos - nunca compartidos con otro cliente de la plataforma.",
	},
];

const PLANES = [
	{
		nombre: "Municipio pequeño",
		poblacion: "< 5.000 hab.",
		precio: "desde 900 €",
		periodo: "/ año",
		detalle: "1-2 colonias, ideal para empezar",
	},
	{
		nombre: "Municipio mediano",
		poblacion: "5.000 - 20.000 hab.",
		precio: "desde 2.500 €",
		periodo: "/ año",
		detalle: "El grueso de los ayuntamientos con programa CER activo",
		destacado: true,
	},
	{
		nombre: "Municipio grande",
		poblacion: "20.000 - 50.000 hab.",
		precio: "desde 6.000 €",
		periodo: "/ año",
		detalle: "Varias colonias y equipo técnico dedicado",
	},
];

export function LandingPage() {
	return (
		<div className="bg-white">
			<header className="border-b border-slate-200">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<span className="text-lg font-semibold text-slate-900">Colonias Felinas</span>
					<nav className="flex items-center gap-6 text-sm">
						<a href="#funciones" className="text-slate-600 hover:text-slate-900">
							Funciones
						</a>
						<a href="#precios" className="text-slate-600 hover:text-slate-900">
							Precios
						</a>
						<Link
							to="/login"
							className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white shadow-sm hover:bg-teal-800"
						>
							Iniciar sesión
						</Link>
					</nav>
				</div>
			</header>

			<main>
				{/* Hero */}
				<section className="mx-auto max-w-6xl px-6 py-20">
					<div className="max-w-2xl">
						<span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
							Software para programas CER municipales
						</span>
						<h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
							La gestión de colonias felinas de tu ayuntamiento, en un solo sitio
						</h1>
						<p className="mt-6 text-lg leading-relaxed text-slate-600">
							Censo de colonias y gatos, historial clínico, comederos, voluntariado y las
							estadísticas que pide la memoria anual - sin hojas de cálculo repartidas entre
							veterinarios, técnicos y voluntarios.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<a
								href={`mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent("Demo de Colonias Felinas")}`}
								className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
							>
								Solicitar una demo
							</a>
							<a
								href="#precios"
								className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
							>
								Ver precios
							</a>
						</div>
					</div>
				</section>

				{/* Funciones */}
				<section id="funciones" className="border-t border-slate-200 bg-slate-50 py-20">
					<div className="mx-auto max-w-6xl px-6">
						<h2 className="text-2xl font-bold text-slate-900">Todo lo que necesita el programa CER</h2>
						<p className="mt-2 max-w-2xl text-slate-600">
							Pensado desde el terreno: lo que hoy vive en cuadernos, grupos de WhatsApp y hojas de
							cálculo distintas, en una sola herramienta con un rol claro para cada persona.
						</p>
						<div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{CARACTERISTICAS.map((c) => (
								<div key={c.titulo} className="rounded-lg border border-slate-200 bg-white p-6">
									<h3 className="font-semibold text-slate-900">{c.titulo}</h3>
									<p className="mt-2 text-sm leading-relaxed text-slate-600">{c.descripcion}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Precios */}
				<section id="precios" className="py-20">
					<div className="mx-auto max-w-6xl px-6">
						<h2 className="text-2xl font-bold text-slate-900">Precios por tamaño de municipio</h2>
						<p className="mt-2 max-w-2xl text-slate-600">
							Un precio anual fijo, sin sorpresas. Incluye alta de la organización, importación
							de datos si vienen de una hoja de cálculo, y formación básica al equipo técnico.
						</p>
						<div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
							{PLANES.map((plan) => (
								<div
									key={plan.nombre}
									className={`rounded-xl border p-6 ${
										plan.destacado
											? "border-teal-700 bg-teal-50/50 shadow-sm ring-1 ring-teal-700"
											: "border-slate-200"
									}`}
								>
									{plan.destacado && (
										<span className="mb-3 inline-block rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-semibold text-white">
											Más habitual
										</span>
									)}
									<h3 className="font-semibold text-slate-900">{plan.nombre}</h3>
									<p className="text-sm text-slate-500">{plan.poblacion}</p>
									<p className="mt-4">
										<span className="text-3xl font-bold text-slate-900">{plan.precio}</span>
										<span className="text-sm text-slate-500"> {plan.periodo}</span>
									</p>
									<p className="mt-3 text-sm text-slate-600">{plan.detalle}</p>
								</div>
							))}
						</div>
						<p className="mt-6 text-sm text-slate-500">
							¿Ciudad grande o necesidades distintas? Escríbenos y preparamos una propuesta a medida.
						</p>
					</div>
				</section>

				{/* CTA final */}
				<section className="border-t border-slate-200 bg-slate-900 py-16">
					<div className="mx-auto max-w-6xl px-6 text-center">
						<h2 className="text-2xl font-bold text-white">¿Hablamos de tu ayuntamiento?</h2>
						<p className="mx-auto mt-2 max-w-xl text-slate-300">
							Te enseñamos el panel con datos de ejemplo y resolvemos las dudas de tu equipo
							técnico, sin compromiso.
						</p>
						<a
							href={`mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent("Demo de Colonias Felinas")}`}
							className="mt-6 inline-block rounded-md bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
						>
							Escribir a {CONTACTO_EMAIL}
						</a>
					</div>
				</section>
			</main>

			<footer className="border-t border-slate-200 py-8">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-slate-500">
					<span>© {new Date().getFullYear()} Colonias Felinas</span>
					<Link to="/login" className="hover:text-slate-700">
						Acceso para clientes
					</Link>
				</div>
			</footer>
		</div>
	);
}
