import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Search, Plus, X, Star, ChevronLeft, ChevronRight, Play, Heart, Clock, CheckCircle,
  BarChart3, Filter, Settings, Download, Upload, Trash2, Edit3, GripVertical,
  Film, Tv, Eye, EyeOff, Calendar, MessageSquare, TrendingUp, Info, Clapperboard,
  List, Grid, ChevronDown, ChevronUp, Bookmark, FolderPlus,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Movie {
  id: string
  tmdbId: number
  title: string
  poster: string
  backdrop: string
  type: 'movie' | 'tv'
  genres: string[]
  year: number
  runtime: number
  overview: string
  categoryId: string
  watched: {
    isWatched: boolean
    rating: number
    watchedAt: string
    comment: string
  }
  addedAt: string
}

interface Category {
  id: string
  name: string
  color: string
  icon: string
  order: number
  itemsOrder: string[]
}

interface AppState {
  categories: Category[]
  movies: Movie[]
  settings: {
    tmdbApiKey: string
    defaultView: 'rows' | 'compact'
  }
}

interface TMDBResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  media_type?: string
  genre_ids: number[]
  release_date?: string
  first_air_date?: string
  runtime?: number
  overview: string
  vote_average: number
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TMDB_IMG = 'https://image.tmdb.org/t/p'
const TMDB_API = 'https://api.themoviedb.org/3'
const LS_KEY = 'netflix-watchlist-data'

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantaisie', 36: 'Histoire',
  27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance',
  878: 'Science-Fiction', 10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
  10759: 'Action & Aventure', 10762: 'Enfants', 10763: 'News', 10764: 'Réalité',
  10765: 'Sci-Fi & Fantaisie', 10766: 'Soap', 10767: 'Talk', 10768: 'Guerre & Politique',
}

const ICON_MAP: Record<string, React.ElementType> = {
  Play, Heart, Clock, CheckCircle, Star, Bookmark, Film, Tv, Eye, TrendingUp, List, Clapperboard,
}

const CATEGORY_COLORS = [
  '#E50914', '#FFD700', '#00D4AA', '#4A90D9', '#9B59B6',
  '#E67E22', '#1ABC9C', '#E74C3C', '#3498DB', '#2ECC71',
]

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────

function createDemoData(): AppState {
  const categories: Category[] = [
    { id: 'cat-1', name: 'Ma Liste', color: '#E50914', icon: 'Bookmark', order: 0, itemsOrder: ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'] },
    { id: 'cat-2', name: 'En cours', color: '#4A90D9', icon: 'Play', order: 1, itemsOrder: ['m-6', 'm-7', 'm-8'] },
    { id: 'cat-3', name: 'Terminé', color: '#00D4AA', icon: 'CheckCircle', order: 2, itemsOrder: ['m-9', 'm-10', 'm-11', 'm-12'] },
    { id: 'cat-4', name: 'Favoris', color: '#FFD700', icon: 'Heart', order: 3, itemsOrder: ['m-13', 'm-14', 'm-15', 'm-16'] },
  ]

  const movies: Movie[] = [
    {
      id: 'm-1', tmdbId: 550, title: 'Fight Club', poster: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      backdrop: '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg', type: 'movie', genres: ['Drame', 'Thriller'],
      year: 1999, runtime: 139, overview: "Le narrateur, un homme sans nom, souffre d'insomnie chronique. Pour s'en sortir, il rencontre Tyler Durden, un vendeur de savon charismatique, et ensemble ils fondent le Fight Club.",
      categoryId: 'cat-1', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-01-15',
    },
    {
      id: 'm-2', tmdbId: 680, title: 'Pulp Fiction', poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      backdrop: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', type: 'movie', genres: ['Crime', 'Thriller'],
      year: 1994, runtime: 154, overview: "L'odyssée sanglante et burlesque de petits malfrats dans la jungle de Hollywood à travers trois histoires qui s'entremêlent.",
      categoryId: 'cat-1', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-01-16',
    },
    {
      id: 'm-3', tmdbId: 155, title: 'The Dark Knight', poster: '/qJ2tW6WMUDux911BTUgMe1RYHu.jpg',
      backdrop: '/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg', type: 'movie', genres: ['Action', 'Crime', 'Drame'],
      year: 2008, runtime: 152, overview: "Batman aborde une nouvelle phase de sa lutte contre le crime. Avec le lieutenant de police Jim Gordon et le procureur Harvey Dent, Batman entreprend de démanteler les organisations criminelles qui infestent les rues de Gotham.",
      categoryId: 'cat-1', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-01-17',
    },
    {
      id: 'm-4', tmdbId: 238, title: 'Le Parrain', poster: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      backdrop: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg', type: 'movie', genres: ['Drame', 'Crime'],
      year: 1972, runtime: 175, overview: "En 1945, à New York, les Corleone sont une des cinq familles de la mafia. Don Vito Corleone, le Parrain, dirige son empire avec fermeté.",
      categoryId: 'cat-1', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-01-18',
    },
    {
      id: 'm-5', tmdbId: 27205, title: 'Inception', poster: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
      backdrop: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg', type: 'movie', genres: ['Action', 'Science-Fiction', 'Aventure'],
      year: 2010, runtime: 148, overview: "Dom Cobb est un voleur expérimenté. Sa spécialité : l'extraction, l'art de s'introduire dans les rêves des gens pour leur voler leurs secrets les plus enfouis.",
      categoryId: 'cat-1', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-01-19',
    },
    {
      id: 'm-6', tmdbId: 1396, title: 'Breaking Bad', poster: '/ztkUQFLlC19CCMYHW73IJXfgJv.jpg',
      backdrop: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', type: 'tv', genres: ['Drame', 'Crime'],
      year: 2008, runtime: 45, overview: "Walter White, un professeur de chimie surdiplômé devenu modeste enseignant, apprend qu'il est atteint d'un cancer des poumons. Pour assurer l'avenir financier de sa famille, il se lance dans la fabrication de méthamphétamine.",
      categoryId: 'cat-2', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-02-01',
    },
    {
      id: 'm-7', tmdbId: 94997, title: 'House of the Dragon', poster: '/z2yahl2uefxDCl0nogcRBstwruJ.jpg',
      backdrop: '/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg', type: 'tv', genres: ['Drame', 'Fantaisie', 'Action'],
      year: 2022, runtime: 60, overview: "Basée 200 ans avant les événements du Trône de Fer, cette série raconte l'histoire de la Maison Targaryen.",
      categoryId: 'cat-2', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-02-05',
    },
    {
      id: 'm-8', tmdbId: 1399, title: 'Game of Thrones', poster: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      backdrop: '/zuW6fOiusv4X9nnW3paHGfXcSll.jpg', type: 'tv', genres: ['Drame', 'Fantaisie', 'Action'],
      year: 2011, runtime: 60, overview: "Sept familles nobles se disputent le contrôle du Trône de Fer des Sept Royaumes de Westeros.",
      categoryId: 'cat-2', watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' }, addedAt: '2024-02-10',
    },
    {
      id: 'm-9', tmdbId: 278, title: 'Les Évadés', poster: '/9cDCOEsbVpVmCezVH6RhLqKpLFf.jpg',
      backdrop: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', type: 'movie', genres: ['Drame', 'Crime'],
      year: 1994, runtime: 142, overview: "En 1947, Andy Dufresne, un jeune banquier, est condamné à la prison à vie pour le meurtre de sa femme et de son amant. Enfermé à Shawshank, il va nouer une amitié avec Red, un autre détenu.",
      categoryId: 'cat-3', watched: { isWatched: true, rating: 5, watchedAt: '2024-03-01', comment: 'Un chef-d\'oeuvre absolu. La fin est sublime.' }, addedAt: '2024-01-10',
    },
    {
      id: 'm-10', tmdbId: 13, title: 'Forrest Gump', poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
      backdrop: '/7c9UVPPiTPltouxRxY7UhV717Xs.jpg', type: 'movie', genres: ['Drame', 'Comédie', 'Romance'],
      year: 1994, runtime: 142, overview: "Quelques décennies d'histoire américaine, à travers le regard et l'expérience d'un homme simple d'esprit mais au grand coeur.",
      categoryId: 'cat-3', watched: { isWatched: true, rating: 4, watchedAt: '2024-03-05', comment: 'Touchant et inspirant.' }, addedAt: '2024-01-11',
    },
    {
      id: 'm-11', tmdbId: 603, title: 'Matrix', poster: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      backdrop: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg', type: 'movie', genres: ['Action', 'Science-Fiction'],
      year: 1999, runtime: 136, overview: "Programmeur anonyme le jour, hacker redouté la nuit, Neo est contacté par Morpheus qui lui révèle la vérité sur la réalité : ce n'est qu'une simulation créée par les machines.",
      categoryId: 'cat-3', watched: { isWatched: true, rating: 5, watchedAt: '2024-03-10', comment: 'Révolutionnaire. Encore incroyable après toutes ces années.' }, addedAt: '2024-01-12',
    },
    {
      id: 'm-12', tmdbId: 120, title: 'Le Seigneur des Anneaux: La Communauté de l\'Anneau', poster: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
      backdrop: '/pIUvQ9Ed35wlWhY2oU6OmwEgzx8.jpg', type: 'movie', genres: ['Aventure', 'Fantaisie', 'Action'],
      year: 2001, runtime: 178, overview: "Dans la paisible Comté, le jeune hobbit Frodon hérite de l'Anneau Unique. Objet de convoitise, l'anneau doit être détruit dans les flammes de la Montagne du Destin.",
      categoryId: 'cat-3', watched: { isWatched: true, rating: 5, watchedAt: '2024-03-15', comment: 'Épique. Un voyage inoubliable.' }, addedAt: '2024-01-13',
    },
    {
      id: 'm-13', tmdbId: 157336, title: 'Interstellar', poster: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop: '/xJHokMbljvjADYdit5fK1DDrFXp.jpg', type: 'movie', genres: ['Aventure', 'Drame', 'Science-Fiction'],
      year: 2014, runtime: 169, overview: "Dans un futur proche, la Terre est devenue hostile pour l'homme. Un groupe d'explorateurs utilise un trou de ver pour voyager au-delà de notre galaxie et trouver une nouvelle planète habitable.",
      categoryId: 'cat-4', watched: { isWatched: true, rating: 5, watchedAt: '2024-02-20', comment: 'Visuellement époustouflant. Nolan au sommet.' }, addedAt: '2024-01-20',
    },
    {
      id: 'm-14', tmdbId: 244786, title: 'Whiplash', poster: '/7fn624j544nhbzv352iExRhbYoGa.jpg',
      backdrop: '/fRGxZuo7jJUWQsVzOn60FcyMFb6.jpg', type: 'movie', genres: ['Drame', 'Musique'],
      year: 2014, runtime: 107, overview: "Andrew, 19 ans, rêve de devenir l'un des meilleurs batteurs de jazz. Il intègre le conservatoire et se retrouve sous la coupe de Terence Fletcher, un professeur tyrannique.",
      categoryId: 'cat-4', watched: { isWatched: true, rating: 5, watchedAt: '2024-02-25', comment: 'Intense du début à la fin. JK Simmons magistral.' }, addedAt: '2024-01-21',
    },
    {
      id: 'm-15', tmdbId: 496243, title: 'Parasite', poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      backdrop: '/TU9Kz1iXHoFIBpCm56RpYR1DXEB.jpg', type: 'movie', genres: ['Comédie', 'Thriller', 'Drame'],
      year: 2019, runtime: 133, overview: "Toute la famille de Ki-taek est au chômage. Un jour, son fils Ki-woo est recommandé pour donner des cours à la fille d'une famille riche, les Park.",
      categoryId: 'cat-4', watched: { isWatched: true, rating: 5, watchedAt: '2024-03-01', comment: 'Palme d\'Or méritée. Bong Joon-ho est un génie.' }, addedAt: '2024-01-22',
    },
    {
      id: 'm-16', tmdbId: 569094, title: 'Spider-Man: Across the Spider-Verse', poster: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
      backdrop: '/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg', type: 'movie', genres: ['Animation', 'Action', 'Aventure'],
      year: 2023, runtime: 140, overview: "Miles Morales repart à l'aventure dans le multivers, où il rencontre une équipe de Spider-People chargée de protéger son existence.",
      categoryId: 'cat-4', watched: { isWatched: true, rating: 5, watchedAt: '2024-03-10', comment: 'Animation révolutionnaire. Visuellement parfait.' }, addedAt: '2024-01-23',
    },
  ]

  return {
    categories,
    movies,
    settings: { tmdbApiKey: '', defaultView: 'rows' },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return createDemoData()
}

function saveState(state: AppState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state))
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function genresFromIds(ids: number[]): string[] {
  return ids.map(id => GENRE_MAP[id]).filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useWatchlist
// ─────────────────────────────────────────────────────────────────────────────

function useWatchlist() {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => { saveState(state) }, [state])

  const addMovie = useCallback((movie: Omit<Movie, 'id' | 'addedAt'>, categoryId: string) => {
    const id = `m-${uid()}`
    setState(prev => {
      const newMovie: Movie = { ...movie, id, categoryId, addedAt: new Date().toISOString() }
      const cats = prev.categories.map(c =>
        c.id === categoryId ? { ...c, itemsOrder: [...c.itemsOrder, id] } : c
      )
      return { ...prev, movies: [...prev.movies, newMovie], categories: cats }
    })
  }, [])

  const removeMovie = useCallback((movieId: string) => {
    setState(prev => ({
      ...prev,
      movies: prev.movies.filter(m => m.id !== movieId),
      categories: prev.categories.map(c => ({
        ...c, itemsOrder: c.itemsOrder.filter(id => id !== movieId),
      })),
    }))
  }, [])

  const updateMovie = useCallback((movieId: string, updates: Partial<Movie>) => {
    setState(prev => ({
      ...prev,
      movies: prev.movies.map(m => m.id === movieId ? { ...m, ...updates } : m),
    }))
  }, [])

  const updateWatched = useCallback((movieId: string, watched: Partial<Movie['watched']>) => {
    setState(prev => ({
      ...prev,
      movies: prev.movies.map(m =>
        m.id === movieId ? { ...m, watched: { ...m.watched, ...watched } } : m
      ),
    }))
  }, [])

  const addCategory = useCallback((name: string, color: string, icon: string) => {
    const id = `cat-${uid()}`
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, {
        id, name, color, icon, order: prev.categories.length, itemsOrder: [],
      }],
    }))
  }, [])

  const removeCategory = useCallback((catId: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== catId),
      movies: prev.movies.filter(m => m.categoryId !== catId),
    }))
  }, [])

  const updateCategory = useCallback((catId: string, updates: Partial<Category>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === catId ? { ...c, ...updates } : c),
    }))
  }, [])

  const reorderCategories = useCallback((oldIndex: number, newIndex: number) => {
    setState(prev => ({
      ...prev,
      categories: arrayMove(prev.categories, oldIndex, newIndex).map((c, i) => ({ ...c, order: i })),
    }))
  }, [])

  const reorderMoviesInCategory = useCallback((catId: string, newOrder: string[]) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === catId ? { ...c, itemsOrder: newOrder } : c),
    }))
  }, [])

  const moveMovieToCategory = useCallback((movieId: string, fromCatId: string, toCatId: string) => {
    setState(prev => ({
      ...prev,
      movies: prev.movies.map(m => m.id === movieId ? { ...m, categoryId: toCatId } : m),
      categories: prev.categories.map(c => {
        if (c.id === fromCatId) return { ...c, itemsOrder: c.itemsOrder.filter(id => id !== movieId) }
        if (c.id === toCatId) return { ...c, itemsOrder: [...c.itemsOrder, movieId] }
        return c
      }),
    }))
  }, [])

  const setApiKey = useCallback((key: string) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, tmdbApiKey: key } }))
  }, [])

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state])

  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json) as AppState
      if (data.categories && data.movies) setState(data)
    } catch { /* ignore invalid json */ }
  }, [])

  const resetData = useCallback(() => { setState(createDemoData()) }, [])

  return {
    state, addMovie, removeMovie, updateMovie, updateWatched,
    addCategory, removeCategory, updateCategory,
    reorderCategories, reorderMoviesInCategory, moveMovieToCategory,
    setApiKey, exportData, importData, resetData,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: StarRating
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({ rating, onChange, size = 20 }: {
  rating: number
  onChange?: (r: number) => void
  size?: number
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onChange?.(i === rating ? 0 : i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => setHover(0)}
          className={`transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!onChange}
        >
          <Star
            size={size}
            className={
              (hover || rating) >= i
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-600'
            }
          />
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: IconPicker
// ─────────────────────────────────────────────────────────────────────────────

function DynamicIcon({ name, size = 20, className = '', style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name] || Bookmark
  return <Icon size={size} className={className} style={style} />
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: HeroBanner
// ─────────────────────────────────────────────────────────────────────────────

function HeroBanner({ movies, onOpenModal }: { movies: Movie[]; onOpenModal: (m: Movie) => void }) {
  const [featured, setFeatured] = useState<Movie | null>(null)

  useEffect(() => {
    if (movies.length > 0) {
      setFeatured(movies[Math.floor(Math.random() * movies.length)])
    }
  }, [movies.length])

  if (!featured) return null

  return (
    <div className="relative h-[50vh] md:h-[70vh] w-full mb-8 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${TMDB_IMG}/original${featured.backdrop})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-netflix-bg via-netflix-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-netflix-bg/80 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 p-6 md:p-12 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          {featured.type === 'tv' ? (
            <span className="bg-netflix-accent px-2 py-0.5 rounded text-xs font-bold uppercase">Série</span>
          ) : (
            <span className="bg-netflix-accent px-2 py-0.5 rounded text-xs font-bold uppercase">Film</span>
          )}
          <span className="text-sm text-gray-300">{featured.year}</span>
          {featured.genres.slice(0, 2).map(g => (
            <span key={g} className="text-sm text-gray-400">• {g}</span>
          ))}
        </div>

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl mb-4 leading-tight">
          {featured.title}
        </h1>

        <p className="text-sm md:text-base text-gray-300 line-clamp-3 mb-6">
          {featured.overview}
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => onOpenModal(featured)}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded font-bold hover:bg-gray-200 transition-colors"
          >
            <Info size={20} /> Plus d'infos
          </button>
          {featured.watched.isWatched && (
            <div className="flex items-center gap-1">
              <StarRating rating={featured.watched.rating} size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SortableMovieCard
// ─────────────────────────────────────────────────────────────────────────────

function SortableMovieCard({ movie, index, showNumbers, onOpenModal, onQuickAdd }: {
  movie: Movie
  index: number
  showNumbers: boolean
  onOpenModal: (m: Movie) => void
  onQuickAdd?: (m: Movie) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: movie.id,
    data: { type: 'movie', movie, categoryId: movie.categoryId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group flex-shrink-0 cursor-grab active:cursor-grabbing"
    >
      <motion.div
        className="relative w-[140px] md:w-[170px] lg:w-[200px] rounded-md overflow-hidden"
        style={{ aspectRatio: '2/3' }}
        whileHover={{ scale: 1.08, zIndex: 20 }}
        transition={{ duration: 0.2 }}
        onClick={() => onOpenModal(movie)}
      >
        {/* Poster */}
        <img
          src={movie.poster ? `${TMDB_IMG}/w500${movie.poster}` : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect fill="%232a2a2a" width="200" height="300"/><text fill="%23666" font-size="14" text-anchor="middle" x="100" y="150">No Poster</text></svg>'}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Number badge */}
        {showNumbers && (
          <div className="absolute top-0 left-0">
            <span className="font-display text-5xl md:text-6xl text-white/30 leading-none pl-1"
              style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)' }}>
              {index + 1}
            </span>
          </div>
        )}

        {/* Watched badge */}
        {movie.watched.isWatched && (
          <div className="absolute top-2 right-2 bg-green-500/90 rounded-full p-1">
            <Eye size={14} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
          <h3 className="font-bold text-sm mb-1 line-clamp-2">{movie.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
            <span>{movie.year}</span>
            {movie.type === 'tv' && <Tv size={12} />}
            {movie.type === 'movie' && <Film size={12} />}
          </div>
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {movie.genres.slice(0, 2).map(g => (
                <span key={g} className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{g}</span>
              ))}
            </div>
          )}
          {movie.watched.rating > 0 && (
            <StarRating rating={movie.watched.rating} size={12} />
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: MovieCardDragOverlay
// ─────────────────────────────────────────────────────────────────────────────

function MovieCardDragOverlay({ movie }: { movie: Movie }) {
  return (
    <div
      className="w-[170px] rounded-md overflow-hidden shadow-2xl ring-2 ring-netflix-accent"
      style={{ aspectRatio: '2/3' }}
    >
      <img
        src={movie.poster ? `${TMDB_IMG}/w500${movie.poster}` : ''}
        alt={movie.title}
        className="w-full h-full object-cover"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: CategoryRow
// ─────────────────────────────────────────────────────────────────────────────

function CategoryRow({ category, movies, allMovies, onOpenModal, onAddClick, onEditCategory, onDeleteCategory, showNumbers }: {
  category: Category
  movies: Movie[]
  allMovies: Movie[]
  onOpenModal: (m: Movie) => void
  onAddClick: (catId: string) => void
  onEditCategory: (cat: Category) => void
  onDeleteCategory: (catId: string) => void
  showNumbers: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    return () => {
      el?.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll, movies.length])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  if (movies.length === 0 && category.itemsOrder.length === 0) {
    return (
      <div className="mb-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: category.color }} />
          <DynamicIcon name={category.icon} size={20} style={{ color: category.color }} />
          <h2 className="text-xl md:text-2xl font-bold">{category.name}</h2>
          <span className="text-gray-500 text-sm">(0)</span>
          <button onClick={() => onAddClick(category.id)} className="ml-auto p-2 hover:bg-white/10 rounded-full transition-colors" title="Ajouter un film">
            <Plus size={20} className="text-gray-400 hover:text-white" />
          </button>
          <button onClick={() => onEditCategory(category)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Edit3 size={16} className="text-gray-500" />
          </button>
          <button onClick={() => onDeleteCategory(category.id)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors">
            <Trash2 size={16} className="text-gray-500 hover:text-red-500" />
          </button>
        </div>
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-netflix-border rounded-lg">
          <button
            onClick={() => onAddClick(category.id)}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
          >
            <Plus size={24} />
            <span>Ajouter un film ou une série</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 group/row">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-4 md:px-6 lg:px-8">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: category.color }} />
        <DynamicIcon name={category.icon} size={20} className="flex-shrink-0" style={{ color: category.color }} />
        <h2 className="text-xl md:text-2xl font-bold whitespace-nowrap">{category.name}</h2>
        <span className="bg-white/10 text-gray-400 text-xs px-2 py-0.5 rounded-full">{movies.length}</span>
        <button onClick={() => onAddClick(category.id)} className="ml-auto p-2 hover:bg-white/10 rounded-full transition-colors" title="Ajouter un film">
          <Plus size={20} className="text-gray-400 hover:text-white" />
        </button>
        <button onClick={() => onEditCategory(category)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Edit3 size={16} className="text-gray-500" />
        </button>
        <button onClick={() => onDeleteCategory(category.id)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors">
          <Trash2 size={16} className="text-gray-500 hover:text-red-500" />
        </button>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        {/* Left arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-12 md:w-16 bg-gradient-to-r from-netflix-bg to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
              <ChevronLeft size={36} className="text-white drop-shadow-lg" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Cards container */}
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-6 lg:px-8 py-4"
        >
          <SortableContext items={category.itemsOrder} strategy={horizontalListSortingStrategy}>
            {category.itemsOrder.map((movieId, index) => {
              const movie = allMovies.find(m => m.id === movieId)
              if (!movie) return null
              return (
                <SortableMovieCard
                  key={movie.id}
                  movie={movie}
                  index={index}
                  showNumbers={showNumbers}
                  onOpenModal={onOpenModal}
                />
              )
            })}
          </SortableContext>
        </div>

        {/* Right arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-0 bottom-0 z-10 w-12 md:w-16 bg-gradient-to-l from-netflix-bg to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
              <ChevronRight size={36} className="text-white drop-shadow-lg" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: MovieModal
// ─────────────────────────────────────────────────────────────────────────────

function MovieModal({ movie, categories, onClose, onUpdate, onUpdateWatched, onRemove, onMove }: {
  movie: Movie | null
  categories: Category[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Movie>) => void
  onUpdateWatched: (id: string, w: Partial<Movie['watched']>) => void
  onRemove: (id: string) => void
  onMove: (movieId: string, fromCatId: string, toCatId: string) => void
}) {
  if (!movie) return null

  const currentCat = categories.find(c => c.id === movie.categoryId)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative bg-netflix-secondary rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Backdrop image */}
          <div className="relative h-[250px] md:h-[350px]">
            <img
              src={`${TMDB_IMG}/original${movie.backdrop || movie.poster}`}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-netflix-secondary via-netflix-secondary/40 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Title overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="font-display text-3xl md:text-5xl mb-2">{movie.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="bg-netflix-accent px-2 py-0.5 rounded text-xs font-bold uppercase">
                  {movie.type === 'tv' ? 'Série' : 'Film'}
                </span>
                <span>{movie.year}</span>
                {movie.runtime > 0 && <span>{movie.runtime} min</span>}
                {currentCat && (
                  <span className="flex items-center gap-1" style={{ color: currentCat.color }}>
                    <DynamicIcon name={currentCat.icon} size={14} />
                    {currentCat.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {movie.genres.map(g => (
                <span key={g} className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">{g}</span>
              ))}
            </div>

            {/* Overview */}
            <p className="text-gray-300 leading-relaxed">{movie.overview}</p>

            {/* Rating */}
            <div className="bg-netflix-card p-4 rounded-lg space-y-4">
              <h3 className="font-bold text-lg">Votre note</h3>
              <StarRating
                rating={movie.watched.rating}
                onChange={(r) => onUpdateWatched(movie.id, { rating: r })}
                size={28}
              />
            </div>

            {/* Watched toggle */}
            <div className="bg-netflix-card p-4 rounded-lg space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-12 h-6 rounded-full relative transition-colors ${movie.watched.isWatched ? 'bg-green-500' : 'bg-gray-600'}`}
                  onClick={() => onUpdateWatched(movie.id, {
                    isWatched: !movie.watched.isWatched,
                    watchedAt: !movie.watched.isWatched ? new Date().toISOString().split('T')[0] : '',
                  })}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${movie.watched.isWatched ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </div>
                <span className="font-medium">{movie.watched.isWatched ? 'Vu' : 'Non vu'}</span>
              </label>

              {movie.watched.isWatched && (
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <input
                    type="date"
                    value={movie.watched.watchedAt}
                    onChange={(e) => onUpdateWatched(movie.id, { watchedAt: e.target.value })}
                    className="bg-netflix-bg border border-netflix-border rounded px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Comment */}
            <div className="bg-netflix-card p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-gray-400" />
                <h3 className="font-bold">Commentaire</h3>
              </div>
              <textarea
                value={movie.watched.comment}
                onChange={(e) => onUpdateWatched(movie.id, { comment: e.target.value })}
                placeholder="Votre avis sur ce film..."
                className="w-full bg-netflix-bg border border-netflix-border rounded-lg p-4 text-sm resize-none h-24 focus:outline-none focus:border-netflix-accent transition-colors"
              />
            </div>

            {/* Move to category */}
            <div className="bg-netflix-card p-4 rounded-lg space-y-3">
              <h3 className="font-bold">Déplacer vers</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (cat.id !== movie.categoryId) {
                        onMove(movie.id, movie.categoryId, cat.id)
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                      cat.id === movie.categoryId
                        ? 'ring-2 ring-offset-2 ring-offset-netflix-card'
                        : 'bg-netflix-bg hover:bg-white/10'
                    }`}
                    style={cat.id === movie.categoryId ? { backgroundColor: cat.color + '30', '--tw-ring-color': cat.color } as React.CSSProperties : {}}
                  >
                    <DynamicIcon name={cat.icon} size={14} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => { onRemove(movie.id); onClose() }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SearchBar (TMDB)
// ─────────────────────────────────────────────────────────────────────────────

function SearchBar({ apiKey, categories, onAdd, onOpenSettings }: {
  apiKey: string
  categories: Category[]
  onAdd: (movie: Omit<Movie, 'id' | 'addedAt'>, catId: string) => void
  onOpenSettings: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCat, setSelectedCat] = useState('')
  const [addingId, setAddingId] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query || query.length < 2 || !apiKey) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${TMDB_API}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=fr-FR&page=1`
        )
        const data = await res.json()
        setResults(
          (data.results || [])
            .filter((r: TMDBResult) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
            .slice(0, 10)
        )
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, apiKey])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAdd = (result: TMDBResult, catId: string) => {
    const movie: Omit<Movie, 'id' | 'addedAt'> = {
      tmdbId: result.id,
      title: result.title || result.name || 'Sans titre',
      poster: result.poster_path || '',
      backdrop: result.backdrop_path || '',
      type: result.media_type === 'tv' ? 'tv' : 'movie',
      genres: genresFromIds(result.genre_ids),
      year: parseInt((result.release_date || result.first_air_date || '0').split('-')[0]) || 0,
      runtime: result.runtime || 0,
      overview: result.overview,
      categoryId: catId,
      watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' },
    }
    onAdd(movie, catId)
    setAddingId(result.id)
    setTimeout(() => setAddingId(null), 1500)
  }

  if (!apiKey) {
    return (
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 bg-netflix-card hover:bg-white/10 px-4 py-2 rounded-lg transition-colors text-sm"
      >
        <Search size={18} className="text-gray-400" />
        <span className="text-gray-400">Configurer l'API TMDB...</span>
      </button>
    )
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un film ou une série..."
          className="w-full bg-netflix-card border border-netflix-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-netflix-accent transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {isOpen && (query.length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-netflix-card border border-netflix-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
          >
            {loading && (
              <div className="p-4 text-center text-gray-400 text-sm">Recherche en cours...</div>
            )}
            {!loading && results.length === 0 && query.length >= 2 && (
              <div className="p-4 text-center text-gray-400 text-sm">Aucun résultat</div>
            )}
            {results.map(result => (
              <div key={result.id} className="border-b border-netflix-border last:border-0">
                <div className="flex gap-4 p-4 hover:bg-white/5 transition-colors">
                  <img
                    src={result.poster_path ? `${TMDB_IMG}/w92${result.poster_path}` : ''}
                    alt=""
                    className="w-12 h-18 object-cover rounded flex-shrink-0"
                    style={{ aspectRatio: '2/3' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">
                      {result.title || result.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span className="uppercase">{result.media_type}</span>
                      <span>{(result.release_date || result.first_air_date || '').split('-')[0]}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.overview}</p>
                    {/* Add to category buttons */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleAdd(result, cat.id)}
                          disabled={addingId === result.id}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-all hover:brightness-125"
                          style={{ backgroundColor: cat.color + '30', color: cat.color }}
                        >
                          {addingId === result.id ? (
                            <CheckCircle size={10} />
                          ) : (
                            <Plus size={10} />
                          )}
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: StatsPanel
// ─────────────────────────────────────────────────────────────────────────────

function StatsPanel({ movies, categories }: { movies: Movie[]; categories: Category[] }) {
  const stats = useMemo(() => {
    const totalMovies = movies.length
    const watched = movies.filter(m => m.watched.isWatched)
    const totalWatched = watched.length
    const avgRating = watched.length > 0
      ? watched.reduce((acc, m) => acc + m.watched.rating, 0) / watched.filter(m => m.watched.rating > 0).length || 0
      : 0
    const totalRuntime = watched.reduce((acc, m) => acc + m.runtime, 0)
    const hours = Math.floor(totalRuntime / 60)
    const mins = totalRuntime % 60

    const byGenre: Record<string, number> = {}
    movies.forEach(m => m.genres.forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1 }))

    const byType = {
      movie: movies.filter(m => m.type === 'movie').length,
      tv: movies.filter(m => m.type === 'tv').length,
    }

    return { totalMovies, totalWatched, avgRating, totalRuntime, hours, mins, byGenre, byType }
  }, [movies])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mb-8">
        <div className="bg-netflix-card rounded-xl p-6 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={24} className="text-netflix-accent" /> Statistiques
          </h2>

          {/* Main stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-netflix-bg rounded-lg p-4">
              <div className="text-3xl font-bold text-netflix-accent">{stats.totalMovies}</div>
              <div className="text-sm text-gray-400 mt-1">Total</div>
            </div>
            <div className="bg-netflix-bg rounded-lg p-4">
              <div className="text-3xl font-bold text-green-500">{stats.totalWatched}</div>
              <div className="text-sm text-gray-400 mt-1">Vus ({stats.totalMovies > 0 ? Math.round(stats.totalWatched / stats.totalMovies * 100) : 0}%)</div>
            </div>
            <div className="bg-netflix-bg rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-400">{stats.avgRating.toFixed(1)}</div>
              <div className="text-sm text-gray-400 mt-1">Note moyenne</div>
            </div>
            <div className="bg-netflix-bg rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">{stats.hours}h{stats.mins}</div>
              <div className="text-sm text-gray-400 mt-1">Temps regardé</div>
            </div>
          </div>

          {/* Types */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-netflix-bg rounded-lg px-4 py-2">
              <Film size={16} className="text-blue-400" />
              <span className="text-sm">{stats.byType.movie} Films</span>
            </div>
            <div className="flex items-center gap-2 bg-netflix-bg rounded-lg px-4 py-2">
              <Tv size={16} className="text-purple-400" />
              <span className="text-sm">{stats.byType.tv} Séries</span>
            </div>
          </div>

          {/* Genres */}
          <div>
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">Par genre</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGenre)
                .sort(([, a], [, b]) => b - a)
                .map(([genre, count]) => (
                  <span key={genre} className="bg-netflix-bg px-3 py-1.5 rounded-lg text-sm">
                    {genre} <span className="text-netflix-accent font-bold">{count}</span>
                  </span>
                ))}
            </div>
          </div>

          {/* Per category */}
          <div>
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">Par catégorie</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map(cat => (
                <div key={cat.id} className="bg-netflix-bg rounded-lg p-3 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div>
                    <div className="text-sm font-medium">{cat.name}</div>
                    <div className="text-xs text-gray-500">{cat.itemsOrder.length} titres</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: FilterBar
// ─────────────────────────────────────────────────────────────────────────────

function FilterBar({ movies, filters, setFilters }: {
  movies: Movie[]
  filters: { type: string; genre: string; minRating: number; year: string; search: string }
  setFilters: (f: typeof filters) => void
}) {
  const allGenres = useMemo(() => {
    const set = new Set<string>()
    movies.forEach(m => m.genres.forEach(g => set.add(g)))
    return Array.from(set).sort()
  }, [movies])

  const allYears = useMemo(() => {
    const set = new Set<number>()
    movies.forEach(m => { if (m.year) set.add(m.year) })
    return Array.from(set).sort((a, b) => b - a)
  }, [movies])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mb-6">
        <div className="bg-netflix-card rounded-xl p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-400">Filtres</span>
          </div>

          {/* Type filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="bg-netflix-bg border border-netflix-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tous types</option>
            <option value="movie">Films</option>
            <option value="tv">Séries</option>
          </select>

          {/* Genre filter */}
          <select
            value={filters.genre}
            onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            className="bg-netflix-bg border border-netflix-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tous genres</option>
            {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Rating filter */}
          <select
            value={filters.minRating}
            onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
            className="bg-netflix-bg border border-netflix-border rounded-lg px-3 py-2 text-sm"
          >
            <option value={0}>Toutes notes</option>
            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r}+ étoiles</option>)}
          </select>

          {/* Year filter */}
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="bg-netflix-bg border border-netflix-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Toutes années</option>
            {allYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Text search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Filtrer par nom..."
              className="w-full bg-netflix-bg border border-netflix-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-netflix-accent"
            />
          </div>

          {/* Clear */}
          {(filters.type || filters.genre || filters.minRating || filters.year || filters.search) && (
            <button
              onClick={() => setFilters({ type: '', genre: '', minRating: 0, year: '', search: '' })}
              className="text-netflix-accent text-sm hover:underline"
            >
              Effacer
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: CategoryManagerModal
// ─────────────────────────────────────────────────────────────────────────────

function CategoryManagerModal({ categories, onAdd, onUpdate, onDelete, onClose }: {
  categories: Category[]
  onAdd: (name: string, color: string, icon: string) => void
  onUpdate: (id: string, updates: Partial<Category>) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])
  const [newIcon, setNewIcon] = useState('Bookmark')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    onAdd(newName.trim(), newColor, newIcon)
    setNewName('')
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-netflix-secondary rounded-xl max-w-lg w-full p-6 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Gérer les catégories</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        {/* New category form */}
        <div className="bg-netflix-card rounded-lg p-4 mb-6 space-y-4">
          <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Nouvelle catégorie</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la catégorie..."
              className="flex-1 bg-netflix-bg border border-netflix-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-netflix-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="bg-netflix-accent hover:bg-netflix-accent-hover disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              Ajouter
            </button>
          </div>

          {/* Color picker */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-400">Couleur:</span>
            {CATEGORY_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Icon picker */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-gray-400">Icône:</span>
            {Object.keys(ICON_MAP).map(name => (
              <button
                key={name}
                onClick={() => setNewIcon(name)}
                className={`p-1.5 rounded transition-colors ${newIcon === name ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <DynamicIcon name={name} size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Existing categories */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 bg-netflix-card rounded-lg p-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <DynamicIcon name={cat.icon} size={16} className="flex-shrink-0" />
              {editingId === cat.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => {
                    if (editName.trim()) onUpdate(cat.id, { name: editName.trim() })
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editName.trim()) onUpdate(cat.id, { name: editName.trim() })
                      setEditingId(null)
                    }
                  }}
                  className="flex-1 bg-netflix-bg border border-netflix-accent rounded px-2 py-1 text-sm focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm">{cat.name}</span>
              )}
              <span className="text-xs text-gray-500">{cat.itemsOrder.length}</span>
              <button
                onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
              >
                <Edit3 size={14} className="text-gray-400" />
              </button>
              <button
                onClick={() => onDelete(cat.id)}
                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
              >
                <Trash2 size={14} className="text-gray-500 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SettingsModal
// ─────────────────────────────────────────────────────────────────────────────

function SettingsModal({ apiKey, onSetApiKey, onExport, onImport, onReset, onClose }: {
  apiKey: string
  onSetApiKey: (key: string) => void
  onExport: () => string
  onImport: (json: string) => void
  onReset: () => void
  onClose: () => void
}) {
  const [key, setKey] = useState(apiKey)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const data = onExport()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `watchlist-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result as string
      onImport(data)
      onClose()
    }
    reader.readAsText(file)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-netflix-secondary rounded-xl max-w-lg w-full p-6 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings size={24} /> Paramètres
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        <div className="space-y-6">
          {/* API Key */}
          <div className="bg-netflix-card rounded-lg p-4 space-y-3">
            <h3 className="font-bold">Clé API TMDB</h3>
            <p className="text-xs text-gray-400">
              Créez un compte gratuit sur themoviedb.org pour obtenir une clé API.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Votre clé API TMDB..."
                className="flex-1 bg-netflix-bg border border-netflix-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-netflix-accent"
              />
              <button
                onClick={() => onSetApiKey(key)}
                className="bg-netflix-accent hover:bg-netflix-accent-hover px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Sauver
              </button>
            </div>
          </div>

          {/* Export/Import */}
          <div className="bg-netflix-card rounded-lg p-4 space-y-3">
            <h3 className="font-bold">Données</h3>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-netflix-bg hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <Download size={16} /> Exporter JSON
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-netflix-bg hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <Upload size={16} /> Importer JSON
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
          </div>

          {/* Reset */}
          <div className="bg-netflix-card rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-red-400">Zone dangereuse</h3>
            <button
              onClick={() => { if (confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) { onReset(); onClose() } }}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} /> Réinitialiser les données
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: AddToCategory Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddToCategoryModal({ categoryId, categories, apiKey, onAdd, onClose }: {
  categoryId: string
  categories: Category[]
  apiKey: string
  onAdd: (movie: Omit<Movie, 'id' | 'addedAt'>, catId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<number>>(new Set())
  const cat = categories.find(c => c.id === categoryId)

  useEffect(() => {
    if (!query || query.length < 2 || !apiKey) { setResults([]); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${TMDB_API}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=fr-FR&page=1`)
        const data = await res.json()
        setResults(
          (data.results || [])
            .filter((r: TMDBResult) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
            .slice(0, 10)
        )
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, apiKey])

  const handleAdd = (result: TMDBResult) => {
    const movie: Omit<Movie, 'id' | 'addedAt'> = {
      tmdbId: result.id,
      title: result.title || result.name || 'Sans titre',
      poster: result.poster_path || '',
      backdrop: result.backdrop_path || '',
      type: result.media_type === 'tv' ? 'tv' : 'movie',
      genres: genresFromIds(result.genre_ids),
      year: parseInt((result.release_date || result.first_air_date || '0').split('-')[0]) || 0,
      runtime: result.runtime || 0,
      overview: result.overview,
      categoryId,
      watched: { isWatched: false, rating: 0, watchedAt: '', comment: '' },
    }
    onAdd(movie, categoryId)
    setAdded(prev => new Set(prev).add(result.id))
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-netflix-secondary rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[80vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plus size={20} /> Ajouter à{' '}
            <span style={{ color: cat?.color }}>{cat?.name}</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        {!apiKey ? (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-2">Configurez votre clé API TMDB dans les paramètres</p>
            <p className="text-xs">pour rechercher des films et séries.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un film ou une série..."
                className="w-full bg-netflix-card border border-netflix-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-netflix-accent"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loading && <div className="text-center py-4 text-gray-400 text-sm">Recherche...</div>}
              {!loading && results.length === 0 && query.length >= 2 && (
                <div className="text-center py-4 text-gray-400 text-sm">Aucun résultat</div>
              )}
              {results.map(result => (
                <div key={result.id} className="flex gap-4 p-3 bg-netflix-card rounded-lg hover:bg-white/5 transition-colors">
                  <img
                    src={`${TMDB_IMG}/w92${result.poster_path}`}
                    alt=""
                    className="w-12 rounded flex-shrink-0"
                    style={{ aspectRatio: '2/3' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{result.title || result.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="uppercase">{result.media_type}</span>
                      <span>{(result.release_date || result.first_air_date || '').split('-')[0]}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(result)}
                    disabled={added.has(result.id)}
                    className={`flex-shrink-0 px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                      added.has(result.id)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-netflix-accent hover:bg-netflix-accent-hover'
                    }`}
                  >
                    {added.has(result.id) ? <CheckCircle size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const {
    state, addMovie, removeMovie, updateMovie, updateWatched,
    addCategory, removeCategory, updateCategory,
    reorderCategories, reorderMoviesInCategory, moveMovieToCategory,
    setApiKey, exportData, importData, resetData,
  } = useWatchlist()

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [addToCategoryId, setAddToCategoryId] = useState<string | null>(null)
  const [showNumbers, setShowNumbers] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filters, setFilters] = useState({ type: '', genre: '', minRating: 0, year: '', search: '' })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // Active drag item
  const activeMovie = activeId ? state.movies.find(m => m.id === activeId) : null

  // Filter movies for display
  const filteredMovieIds = useMemo(() => {
    const set = new Set<string>()
    state.movies.forEach(m => {
      let pass = true
      if (filters.type && m.type !== filters.type) pass = false
      if (filters.genre && !m.genres.includes(filters.genre)) pass = false
      if (filters.minRating && m.watched.rating < filters.minRating) pass = false
      if (filters.year && m.year !== parseInt(filters.year)) pass = false
      if (filters.search && !m.title.toLowerCase().includes(filters.search.toLowerCase())) pass = false
      if (pass) set.add(m.id)
    })
    return set
  }, [state.movies, filters])

  const hasActiveFilters = filters.type || filters.genre || filters.minRating || filters.year || filters.search

  // Sorted categories
  const sortedCategories = useMemo(
    () => [...state.categories].sort((a, b) => a.order - b.order),
    [state.categories]
  )

  // DnD handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    // Could add visual feedback here
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeMovieId = active.id as string
    const overMovieId = over.id as string

    const activeCatId = active.data.current?.categoryId
    const overCatId = over.data.current?.categoryId

    if (!activeCatId) return

    // Same category: reorder
    if (activeCatId === overCatId || !overCatId) {
      const cat = state.categories.find(c => c.id === activeCatId)
      if (!cat) return
      const oldIndex = cat.itemsOrder.indexOf(activeMovieId)
      const newIndex = cat.itemsOrder.indexOf(overMovieId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderMoviesInCategory(activeCatId, arrayMove(cat.itemsOrder, oldIndex, newIndex))
      }
    } else {
      // Different category: move
      moveMovieToCategory(activeMovieId, activeCatId, overCatId)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-netflix-bg">
        {/* ── HEADER ── */}
        <header className="sticky top-0 z-40 bg-gradient-to-b from-netflix-bg via-netflix-bg/95 to-transparent">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <h1 className="font-display text-2xl md:text-3xl text-netflix-accent tracking-wider flex-shrink-0">
                WATCHLIST
              </h1>

              {/* Search */}
              <div className="flex-1 hidden md:block">
                <SearchBar
                  apiKey={state.settings.tmdbApiKey}
                  categories={sortedCategories}
                  onAdd={addMovie}
                  onOpenSettings={() => setShowSettings(true)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowNumbers(!showNumbers)}
                  className={`p-2 rounded-lg transition-colors ${showNumbers ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                  title="Numérotation"
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10'} ${hasActiveFilters ? 'text-netflix-accent' : ''}`}
                  title="Filtres"
                >
                  <Filter size={20} />
                </button>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`p-2 rounded-lg transition-colors ${showStats ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                  title="Statistiques"
                >
                  <BarChart3 size={20} />
                </button>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors"
                  title="Gérer catégories"
                >
                  <FolderPlus size={20} />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors"
                  title="Paramètres"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>

            {/* Mobile search */}
            <div className="mt-3 md:hidden">
              <SearchBar
                apiKey={state.settings.tmdbApiKey}
                categories={sortedCategories}
                onAdd={addMovie}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>
          </div>
        </header>

        {/* ── HERO BANNER ── */}
        {!showFilters && !showStats && (
          <HeroBanner movies={state.movies} onOpenModal={setSelectedMovie} />
        )}

        {/* ── FILTER BAR ── */}
        <AnimatePresence>
          {showFilters && (
            <FilterBar movies={state.movies} filters={filters} setFilters={setFilters} />
          )}
        </AnimatePresence>

        {/* ── STATS PANEL ── */}
        <AnimatePresence>
          {showStats && (
            <StatsPanel movies={state.movies} categories={sortedCategories} />
          )}
        </AnimatePresence>

        {/* ── CATEGORY ROWS ── */}
        <div className="pb-16">
          {sortedCategories.map(cat => {
            const catMovies = cat.itemsOrder
              .map(id => state.movies.find(m => m.id === id))
              .filter((m): m is Movie => !!m && filteredMovieIds.has(m.id))

            // If filters active and no matching movies in this category, hide it
            if (hasActiveFilters && catMovies.length === 0) return null

            return (
              <CategoryRow
                key={cat.id}
                category={{ ...cat, itemsOrder: hasActiveFilters ? catMovies.map(m => m.id) : cat.itemsOrder }}
                movies={catMovies}
                allMovies={state.movies}
                onOpenModal={setSelectedMovie}
                onAddClick={setAddToCategoryId}
                onEditCategory={(c) => { setShowCategoryManager(true) }}
                onDeleteCategory={(id) => {
                  if (confirm('Supprimer cette catégorie et tous ses films ?')) removeCategory(id)
                }}
                showNumbers={showNumbers}
              />
            )
          })}
        </div>

        {/* ── DRAG OVERLAY ── */}
        <DragOverlay>
          {activeMovie && <MovieCardDragOverlay movie={activeMovie} />}
        </DragOverlay>

        {/* ── MOVIE MODAL ── */}
        <AnimatePresence>
          {selectedMovie && (
            <MovieModal
              movie={selectedMovie}
              categories={sortedCategories}
              onClose={() => setSelectedMovie(null)}
              onUpdate={(id, updates) => { updateMovie(id, updates); setSelectedMovie(prev => prev ? { ...prev, ...updates } : null) }}
              onUpdateWatched={(id, w) => { updateWatched(id, w); setSelectedMovie(prev => prev ? { ...prev, watched: { ...prev.watched, ...w } } : null) }}
              onRemove={removeMovie}
              onMove={(movieId, from, to) => { moveMovieToCategory(movieId, from, to); setSelectedMovie(prev => prev ? { ...prev, categoryId: to } : null) }}
            />
          )}
        </AnimatePresence>

        {/* ── SETTINGS MODAL ── */}
        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              apiKey={state.settings.tmdbApiKey}
              onSetApiKey={setApiKey}
              onExport={exportData}
              onImport={importData}
              onReset={resetData}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>

        {/* ── CATEGORY MANAGER ── */}
        <AnimatePresence>
          {showCategoryManager && (
            <CategoryManagerModal
              categories={sortedCategories}
              onAdd={addCategory}
              onUpdate={updateCategory}
              onDelete={removeCategory}
              onClose={() => setShowCategoryManager(false)}
            />
          )}
        </AnimatePresence>

        {/* ── ADD TO CATEGORY MODAL ── */}
        <AnimatePresence>
          {addToCategoryId && (
            <AddToCategoryModal
              categoryId={addToCategoryId}
              categories={sortedCategories}
              apiKey={state.settings.tmdbApiKey}
              onAdd={addMovie}
              onClose={() => setAddToCategoryId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  )
}
