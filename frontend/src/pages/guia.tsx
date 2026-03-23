import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, CheckSquare, FileText, UsersRound,
  Image, Contact, BotMessageSquare, ChevronDown, ChevronRight,
  BookOpen, Users, Search, ListChecks, Upload, MessageSquare,
  GripVertical, Pencil, UserPlus, Plus, Download, Paperclip,
  ClipboardList, Building2, Calendar, Settings,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guía de uso</h1>
        <p className="text-muted-foreground">
          Manual rápido para sacar el máximo partido a Bilera
        </p>
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <p className="text-sm">
          <strong>Bilera</strong> es la herramienta de gestión de tu asociación. Aquí puedes organizar
          eventos, gestionar cursos e inscripciones, administrar documentos, reservar espacios,
          coordinar grupos de trabajo y mucho más. A continuación te explicamos cada sección.
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
            Es la página de inicio. Muestra un resumen rápido de la actividad reciente de la asociación:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Miembros activos</strong> — cuántas personas forman parte de la asociación</li>
            <li><strong>Eventos del mes</strong> — reuniones, tareas y eventos de este mes</li>
            <li><strong>Documentos</strong> — total de documentos subidos</li>
            <li><strong>Próximos eventos</strong> — lo que viene en los próximos días</li>
          </ul>
          <Tip>Cada tarjeta del panel es clicable. Pulsa en "Miembros Activos" para ver el directorio completo.</Tip>
        </Section>

        {/* Tareas (Kanban) */}
        <Section
          icon={<CheckSquare className="h-5 w-5 text-primary" />}
          title="Tareas"
        >
          <p>
            Las tareas se muestran en un tablero con tres columnas:
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Pendiente</Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">En Progreso</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Hecho</Badge>
          </div>
          <Step icon={<GripVertical className="h-3.5 w-3.5" />} text="Arrastra una tarjeta de una columna a otra para cambiar su estado" />
          <Step icon={<ListChecks className="h-3.5 w-3.5" />} text="Usa los filtros de persona y tipo para encontrar tareas concretas" />
          <Tip>Puedes marcar una tarea como "Hecho" directamente con el icono de check en la tarjeta.</Tip>
        </Section>

        {/* Eventos */}
        <Section
          icon={<CalendarDays className="h-5 w-5 text-primary" />}
          title="Eventos"
        >
          <p>
            Aquí se registran todos los eventos de la asociación: reuniones, actos, visitas, etc.
            Puedes verlos en formato lista o en el calendario mensual.
          </p>
          <p className="font-medium text-foreground">Crear un evento:</p>
          <Step icon={<Plus className="h-3.5 w-3.5" />} text="Pulsa 'Nueva' arriba a la derecha" />
          <Step icon={<Pencil className="h-3.5 w-3.5" />} text="Rellena título, tipo (tarea, reunión, evento...), fecha, lugar y descripción" />
          <Step icon={<UserPlus className="h-3.5 w-3.5" />} text="Añade participantes: miembros de la asociación y/o contactos externos" />

          <p className="font-medium text-foreground">Detalle de evento:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Izquierda</strong> — notas/acta, documentos adjuntos y álbumes de fotos</li>
            <li><strong>Derecha</strong> — detalles (fecha, lugar, responsable), participantes y timeline</li>
          </ul>
          <Step icon={<Paperclip className="h-3.5 w-3.5" />} text="Puedes adjuntar documentos existentes o subir uno nuevo directamente" />
          <Step icon={<BotMessageSquare className="h-3.5 w-3.5" />} text="Pulsa 'Resumir con IA' para generar un resumen automático del evento" />
          <Tip>Puedes apuntarte o desapuntarte de un evento con los botones "Unirme" / "Salir".</Tip>
        </Section>

        {/* Cursos y Talleres */}
        <Section
          icon={<ClipboardList className="h-5 w-5 text-primary" />}
          title="Cursos y Talleres"
        >
          <p>
            Gestiona cursos, talleres y actividades con inscripción pública. Los participantes se
            inscriben desde un enlace público sin necesidad de cuenta.
          </p>
          <p className="font-medium text-foreground">Crear un curso:</p>
          <Step icon={<Plus className="h-3.5 w-3.5" />} text="Pulsa 'Nuevo' y sigue el asistente de 3 pasos: datos del curso, sesiones y resumen" />
          <Step icon={<Calendar className="h-3.5 w-3.5" />} text="En las sesiones, usa el generador de recurrencias para crear sesiones automáticamente (semanal, mensual, etc.)" />
          <Step icon={<Upload className="h-3.5 w-3.5" />} text="Sube un PDF del programa y la IA rellenará los campos automáticamente" />

          <p className="font-medium text-foreground">Inscripciones:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Por orden de inscripción (FIFO)</strong> — las plazas se asignan por orden de llegada</li>
            <li><strong>Sorteo</strong> — se recopilan inscripciones y se asignan por sorteo</li>
            <li><strong>Lista de espera</strong> — cuando se completa el aforo, los siguientes quedan en espera</li>
          </ul>
          <p>
            Cada curso tiene un enlace público que puedes copiar y compartir. Los inscritos reciben
            confirmación por email automáticamente.
          </p>
          <Tip>Puedes publicar un curso como borrador y programar la fecha de publicación para que se abra automáticamente.</Tip>
        </Section>

        {/* Espacios y Reservas */}
        <Section
          icon={<Building2 className="h-5 w-5 text-primary" />}
          title="Espacios y Reservas"
        >
          <p>
            Gestiona las salas y espacios disponibles de la asociación y sus reservas.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Cada espacio tiene nombre, ubicación, capacidad y un color identificativo</li>
            <li>Las reservas se ven en un calendario con detección de conflictos</li>
            <li>Al crear un curso, puedes seleccionar un espacio y el aforo se ajusta automáticamente</li>
          </ul>
          <Tip>Si asignas más plazas que el aforo del espacio, verás un aviso para que lo revises.</Tip>
        </Section>

        {/* Colaboradores */}
        <Section
          icon={<Contact className="h-5 w-5 text-primary" />}
          title="Colaboradores"
        >
          <p>
            Agenda de personas y organizaciones externas a la asociación: proveedores, colaboradores,
            ponentes, instituciones, etc.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Cada contacto tiene nombre, email, teléfono, web y categoría</li>
            <li>Filtra por categoría o busca por nombre/email/teléfono</li>
            <li>Los contactos se pueden vincular a eventos como participantes externos</li>
            <li>También se pueden asignar como instructores de cursos</li>
          </ul>
          <Tip>Al vincular un contacto a un evento, puedes asignarle un rol (ponente, proveedor, organizador...).</Tip>
        </Section>

        {/* Grupos de trabajo */}
        <Section
          icon={<UsersRound className="h-5 w-5 text-primary" />}
          title="Grupos de trabajo"
        >
          <p>
            Los grupos sirven para organizar comisiones o equipos de trabajo dentro de la asociación.
            Por ejemplo: "Comisión de fiestas", "Equipo de comunicación", etc.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Cada grupo tiene un nombre, descripción y una lista de miembros</li>
            <li>Los administradores pueden crear grupos, editarlos y añadir o quitar miembros</li>
            <li>Todos los miembros pueden ver los grupos y quiénes los componen</li>
          </ul>
          <Step icon={<UserPlus className="h-3.5 w-3.5" />} text="Para añadir a alguien, entra en el grupo y pulsa 'Añadir'" />
        </Section>

        {/* Documentos */}
        <Section
          icon={<FileText className="h-5 w-5 text-primary" />}
          title="Documentos"
        >
          <p>
            Repositorio central de documentos de la asociación. Soporta PDF, Word, texto y otros formatos.
          </p>
          <p className="font-medium text-foreground">Subir un documento:</p>
          <Step icon={<Upload className="h-3.5 w-3.5" />} text="Pulsa 'Subir', pon un título, selecciona categorías y arrastra el archivo" />
          <p>
            Tras subirlo, el sistema <strong>procesa automáticamente</strong> el contenido:
            extrae el texto, lo divide en fragmentos y lo indexa para que sea buscable.
          </p>
          <p className="font-medium text-foreground">Categorías:</p>
          <p>
            Cada documento puede tener una o varias categorías (Actas, Normativa, Facturas, Subvenciones,
            Contratos, Certificados, Comunicados, Informes, Proyectos, Otros). Usa los filtros para
            encontrar documentos rápidamente.
          </p>
          <Step icon={<Download className="h-3.5 w-3.5" />} text="Puedes descargar el archivo original desde el detalle del documento" />
          <Step icon={<Paperclip className="h-3.5 w-3.5" />} text="Los documentos se pueden vincular a eventos desde el detalle del evento" />
          <Tip>Cuando el estado es "Listo", el Asistente IA puede responder preguntas sobre su contenido.</Tip>
        </Section>

        {/* Galería */}
        <Section
          icon={<Image className="h-5 w-5 text-primary" />}
          title="Galería"
        >
          <p>
            Álbumes de fotos de la asociación. Perfecto para guardar recuerdos de eventos,
            reuniones, actividades, etc.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Crea un álbum con título y descripción</li>
            <li>Sube múltiples fotos de golpe</li>
            <li>Los álbumes se pueden vincular a eventos</li>
          </ul>
          <Tip>La foto de portada del álbum es la primera que se sube. Puedes cambiarla desde el detalle del álbum.</Tip>
        </Section>

        {/* Asistente IA */}
        <Section
          icon={<BotMessageSquare className="h-5 w-5 text-primary" />}
          title="Asistente IA"
        >
          <p>
            Un chat inteligente que tiene acceso a toda la información de la asociación:
            documentos, eventos, cursos, álbumes, etc.
          </p>
          <p className="font-medium text-foreground">Qué puedes preguntarle:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>"Hazme un resumen del programa del curso de cocina"</li>
            <li>"¿Qué eventos tenemos esta semana?"</li>
            <li>"¿Quién participó en la reunión del martes?"</li>
            <li>"¿Qué documentos tenemos sobre subvenciones?"</li>
            <li>"¿Cuánto costó la factura de Adaptia?"</li>
          </ul>
          <p>
            El asistente cita las fuentes que utiliza para responder, así puedes verificar la información.
          </p>
          <Step icon={<MessageSquare className="h-3.5 w-3.5" />} text="Cada conversación se guarda automáticamente en el menú lateral" />
          <Step icon={<Plus className="h-3.5 w-3.5" />} text="Pulsa '+' para iniciar una conversación nueva" />
          <Tip>Cuantos más documentos subas, más útil será el asistente. Busca en el contenido real, no solo en los títulos.</Tip>
        </Section>

        {/* Administración */}
        <Section
          icon={<Settings className="h-5 w-5 text-primary" />}
          title="Administración"
        >
          <p>
            Los administradores tienen acceso a opciones adicionales:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Configuración</strong> — logo de la asociación, tema de colores</li>
            <li><strong>Usuarios</strong> — gestionar miembros, enviar invitaciones, asignar roles</li>
            <li><strong>Plan y uso</strong> — ver cuántos recursos se están usando (miembros, documentos, espacios, almacenamiento)</li>
            <li><strong>Uso de IA</strong> — desglose del consumo de IA por tipo (chat, embeddings, resúmenes) con coste mensual</li>
          </ul>
          <Tip>Invita a nuevos miembros desde Configuración → Usuarios. Recibirán un email para activar su cuenta.</Tip>
        </Section>

        {/* Consejos generales */}
        <Section
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          title="Consejos generales"
        >
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Menú lateral colapsable</strong> — puedes plegar el menú pulsando el icono
              de flecha. Útil en pantallas pequeñas.
            </li>
            <li>
              <strong>Roles</strong> — hay dos roles: <Badge variant="default" className="text-[10px] mx-1">Administrador</Badge>
              y <Badge variant="secondary" className="text-[10px] mx-1">Miembro</Badge>.
              Los administradores pueden crear, editar y eliminar contenido. Los miembros pueden ver todo y participar.
            </li>
            <li>
              <strong>Búsqueda y filtros</strong> — la mayoría de páginas tienen buscador y filtros por estado.
              Puedes cambiar entre vista cuadrícula y lista.
            </li>
            <li>
              <strong>Vincular contenido</strong> — puedes vincular documentos, álbumes y contactos
              a cualquier evento. Esto mantiene todo organizado y conectado.
            </li>
          </ul>
        </Section>
      </div>

      <div className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          ¿Tienes dudas? Pregunta al Asistente IA, que también conoce esta guía.
        </p>
      </div>
    </div>
  );
}
