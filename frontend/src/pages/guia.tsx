import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, CheckSquare, FileText, UsersRound,
  Image, Contact, BotMessageSquare, ChevronDown, ChevronRight,
  BookOpen, Users, Search, ListChecks, Upload, MessageSquare,
  GripVertical, Pencil, UserPlus, Plus, Download, Paperclip,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ icon, title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
        onClick={() => setOpen(!open)}
      >
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">{icon}</div>
        <h2 className="text-base font-semibold flex-1">{title}</h2>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="ml-[52px] space-y-3 text-sm text-muted-foreground leading-relaxed">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-xs">
      <span className="shrink-0 font-bold">Consejo:</span>
      <span>{children}</span>
    </div>
  );
}

function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 mt-0.5 text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export function GuiaPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guia de uso</h1>
        <p className="text-muted-foreground">
          Manual rapido para sacar el maximo partido a Bilera
        </p>
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <p className="text-sm">
          <strong>Bilera</strong> es la herramienta de gestion de tu asociacion. Aqui puedes organizar
          actividades, gestionar documentos, coordinar grupos de trabajo y mucho mas. A continuacion
          te explicamos cada seccion.
        </p>
      </div>

      <div className="space-y-3">
        {/* Panel Principal */}
        <Section
          icon={<LayoutDashboard className="h-5 w-5 text-primary" />}
          title="Panel Principal"
          defaultOpen={true}
        >
          <p>
            Es la pagina de inicio. Muestra un resumen rapido de la actividad de la asociacion:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Miembros activos</strong> — cuantas personas forman parte de la asociacion</li>
            <li><strong>Actividades del mes</strong> — reuniones, tareas y eventos de este mes</li>
            <li><strong>Documentos</strong> — total de documentos subidos</li>
            <li><strong>Proximos eventos</strong> — lo que viene en los proximos dias</li>
          </ul>
          <p>
            Tambien veras las <strong>actividades recientes</strong> y los <strong>documentos recientes</strong>.
            Haz clic en cualquier elemento para ir directamente a su detalle.
          </p>
          <Tip>Cada tarjeta del panel es clicable. Pulsa en "Miembros Activos" para ver el directorio completo.</Tip>
        </Section>

        {/* Actividades */}
        <Section
          icon={<CalendarDays className="h-5 w-5 text-primary" />}
          title="Actividades (Calendario)"
        >
          <p>
            Aqui se registran todas las actividades de la asociacion: reuniones, eventos, visitas, etc.
            Tiene dos vistas:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Calendario</strong> — vista mensual con las actividades marcadas por color segun tipo</li>
            <li><strong>Lista</strong> — todas las actividades ordenadas, con filtros</li>
          </ul>
          <p className="font-medium text-foreground">Crear una actividad:</p>
          <Step icon={<Plus className="h-3.5 w-3.5" />} text="Pulsa 'Nueva Actividad' arriba a la derecha" />
          <Step icon={<Pencil className="h-3.5 w-3.5" />} text="Rellena titulo, tipo (tarea, reunion, evento...), fecha, lugar y descripcion" />
          <Step icon={<UserPlus className="h-3.5 w-3.5" />} text="Anade participantes: miembros de la asociacion y/o contactos externos" />

          <p className="font-medium text-foreground">Detalle de actividad:</p>
          <p>Al entrar en una actividad veras dos columnas:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Izquierda</strong> — notas/acta, documentos adjuntos y albums de fotos</li>
            <li><strong>Derecha</strong> — detalles (fecha, lugar, responsable), participantes y timeline</li>
          </ul>
          <Step icon={<Paperclip className="h-3.5 w-3.5" />} text="Puedes adjuntar documentos existentes o subir uno nuevo directamente" />
          <Step icon={<BotMessageSquare className="h-3.5 w-3.5" />} text="Pulsa 'Resumir con IA' para generar un resumen automatico de la actividad" />
          <Tip>Puedes apuntarte o desapuntarte de una actividad con los botones "Unirme" / "Salir".</Tip>
        </Section>

        {/* Tareas (Kanban) */}
        <Section
          icon={<CheckSquare className="h-5 w-5 text-primary" />}
          title="Tareas (Tablero Kanban)"
        >
          <p>
            Las tareas se muestran en un tablero con tres columnas:
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Por Hacer</Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">En Progreso</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Hecho</Badge>
          </div>
          <Step icon={<GripVertical className="h-3.5 w-3.5" />} text="Arrastra una tarjeta de una columna a otra para cambiar su estado" />
          <Step icon={<ListChecks className="h-3.5 w-3.5" />} text="Usa los filtros de persona y tipo para encontrar tareas concretas" />
          <p>
            Haz clic en cualquier tarjeta para ir al detalle completo de la actividad.
          </p>
          <Tip>Puedes marcar una tarea como "Hecho" directamente con el icono de check en la tarjeta.</Tip>
        </Section>

        {/* Historial */}
        <Section
          icon={<Search className="h-5 w-5 text-primary" />}
          title="Historial"
        >
          <p>
            El historial muestra un registro completo de todas las actividades. Puedes filtrar por:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Persona</strong> — ver solo actividades en las que participo alguien concreto</li>
            <li><strong>Tipo</strong> — tarea, reunion, evento, otros</li>
            <li><strong>Rango de fechas</strong> — desde / hasta</li>
          </ul>
          <p>
            Cada actividad muestra sus participantes como badges. Pulsa "Descripcion" para expandir
            las notas de esa actividad sin salir de la pagina.
          </p>
        </Section>

        {/* Miembros */}
        <Section
          icon={<Users className="h-5 w-5 text-primary" />}
          title="Miembros"
        >
          <p>
            Directorio de todos los miembros activos de la asociacion. Puedes:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Buscar por nombre o email</li>
            <li>Ver el perfil de cada miembro: email, telefono, bio y numero de actividades</li>
            <li>Los administradores pueden crear nuevos miembros</li>
          </ul>
          <Tip>El avatar con iniciales tiene un color unico para cada persona, para identificarla rapidamente.</Tip>
        </Section>

        {/* Grupos */}
        <Section
          icon={<UsersRound className="h-5 w-5 text-primary" />}
          title="Grupos"
        >
          <p>
            Los grupos sirven para organizar comisiones o equipos de trabajo dentro de la asociacion.
            Por ejemplo: "Comision de fiestas", "Equipo de comunicacion", etc.
          </p>
          <p className="font-medium text-foreground">Como funcionan:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Cada grupo tiene un nombre, descripcion y una lista de miembros</li>
            <li>Los administradores pueden crear grupos, editarlos y anadir o quitar miembros</li>
            <li>Todos los miembros pueden ver los grupos y quienes los componen</li>
          </ul>
          <Step icon={<UserPlus className="h-3.5 w-3.5" />} text="Para anadir a alguien, entra en el grupo y pulsa 'Anadir'" />
        </Section>

        {/* Documentos */}
        <Section
          icon={<FileText className="h-5 w-5 text-primary" />}
          title="Documentos"
        >
          <p>
            Repositorio central de documentos de la asociacion. Soporta PDF, Word, texto y otros formatos.
          </p>
          <p className="font-medium text-foreground">Subir un documento:</p>
          <Step icon={<Upload className="h-3.5 w-3.5" />} text="Pulsa 'Subir Documento', pon un titulo y selecciona el archivo" />
          <p>
            Tras subirlo, el sistema <strong>procesa automaticamente</strong> el contenido:
            extrae el texto, lo divide en fragmentos y lo indexa para que sea buscable.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">Pendiente</Badge>
            <Badge variant="secondary">Procesando</Badge>
            <Badge>Listo</Badge>
            <Badge variant="destructive">Error</Badge>
          </div>
          <p>
            Cuando el estado es <strong>"Listo"</strong>, el documento ya es buscable y el Asistente IA
            puede responder preguntas sobre su contenido.
          </p>
          <Step icon={<Download className="h-3.5 w-3.5" />} text="Puedes descargar el archivo original desde el detalle del documento" />
          <Step icon={<Paperclip className="h-3.5 w-3.5" />} text="Los documentos se pueden vincular a actividades desde el detalle de la actividad" />
          <Tip>Usa la barra de busqueda para encontrar documentos por palabras clave de su contenido.</Tip>
        </Section>

        {/* Galeria */}
        <Section
          icon={<Image className="h-5 w-5 text-primary" />}
          title="Galeria"
        >
          <p>
            Albums de fotos de la asociacion. Perfecto para guardar recuerdos de eventos,
            reuniones, actividades, etc.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Crea un album con titulo y descripcion</li>
            <li>Sube multiples fotos de golpe</li>
            <li>Los albums se pueden vincular a actividades</li>
          </ul>
          <Tip>La foto de portada del album es la primera que se sube. Puedes cambiarla desde el detalle del album.</Tip>
        </Section>

        {/* Contactos */}
        <Section
          icon={<Contact className="h-5 w-5 text-primary" />}
          title="Contactos"
        >
          <p>
            Agenda de personas y organizaciones externas a la asociacion: proveedores, colaboradores,
            ponentes, instituciones, etc.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Cada contacto tiene nombre, email, telefono, web y categoria</li>
            <li>Filtra por categoria o busca por nombre/email/telefono</li>
            <li>Los contactos se pueden vincular a actividades como participantes externos</li>
          </ul>
          <Tip>Al vincular un contacto a una actividad, puedes asignarle un rol (ponente, proveedor, organizador...).</Tip>
        </Section>

        {/* Asistente IA */}
        <Section
          icon={<BotMessageSquare className="h-5 w-5 text-primary" />}
          title="Asistente IA"
        >
          <p>
            Un chat inteligente que tiene acceso a toda la informacion de la asociacion:
            documentos, actividades, albums, miembros, etc.
          </p>
          <p className="font-medium text-foreground">Que puedes preguntarle:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>"Hazme un resumen del pliego de la casa de cultura"</li>
            <li>"Que actividades tuvimos en febrero?"</li>
            <li>"Quien participo en la reunion del martes?"</li>
            <li>"Que documentos tenemos sobre subvenciones?"</li>
            <li>"Redactame un acta de la ultima asamblea"</li>
          </ul>
          <p className="font-medium text-foreground">Conversaciones:</p>
          <Step icon={<MessageSquare className="h-3.5 w-3.5" />} text="Cada conversacion se guarda automaticamente en el sidebar izquierdo" />
          <Step icon={<Plus className="h-3.5 w-3.5" />} text="Pulsa '+' para iniciar una conversacion nueva" />
          <p>
            El asistente busca en el contenido real de los documentos (no solo en los titulos),
            asi que cuantos mas documentos subas, mas util sera.
          </p>
          <Tip>Si el asistente no encuentra algo, prueba a reformular la pregunta con otras palabras.</Tip>
        </Section>

        {/* Sidebar */}
        <Section
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          title="Consejos generales"
        >
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Sidebar colapsable</strong> — puedes plegar el menu lateral pulsando el icono
              de flecha. Util en pantallas pequenas.
            </li>
            <li>
              <strong>Roles</strong> — hay dos roles: <Badge variant="default" className="text-[10px] mx-1">Administrador</Badge>
              y <Badge variant="secondary" className="text-[10px] mx-1">Miembro</Badge>.
              Los administradores pueden crear/editar/eliminar contenido. Los miembros pueden ver todo y participar en actividades.
            </li>
            <li>
              <strong>Busqueda</strong> — la mayoria de paginas tienen un buscador.
              Empieza a escribir y los resultados se filtran automaticamente.
            </li>
            <li>
              <strong>Vincular contenido</strong> — puedes vincular documentos, albums y contactos
              a cualquier actividad. Esto mantiene todo organizado y conectado.
            </li>
          </ul>
        </Section>
      </div>

      <div className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          ¿Tienes dudas? Pregunta al Asistente IA, que tambien conoce esta guia.
        </p>
      </div>
    </div>
  );
}
