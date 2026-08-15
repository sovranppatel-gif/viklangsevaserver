import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Donation } from '../models/Donation.js'
import { Enquiry } from '../models/Enquiry.js'
import { Volunteer } from '../models/Volunteer.js'
import { getOrCreateBlog } from '../models/BlogContent.js'

const router = Router()

const METHOD_META = {
  upi: { label: 'UPI / QR Code', color: '#3B82F6' },
  bank_transfer: { label: 'Bank Transfer', color: '#10B981' },
  cash: { label: 'Cash', color: '#8B5CF6' },
  cheque: { label: 'Cheque', color: '#F59E0B' },
  other: { label: 'Other', color: '#64748B' },
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatInr(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

function formatPercent(value) {
  const n = Number(value) || 0
  return `${Math.abs(n).toFixed(1).replace(/\.0$/, '')}%`
}

function percentChange(current, previous) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return 'DN'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function methodLabel(method) {
  return METHOD_META[method]?.label || 'Other'
}

function statusLabel(status) {
  if (status === 'receipt_sent') return 'Receipt sent'
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'cancelled') return 'Cancelled'
  return 'New'
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function formatShortDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

router.get('/', requireAuth, async (_req, res) => {
  try {
    const today = startOfDay(new Date())
    const weekStart = addDays(today, -6)
    const prevWeekStart = addDays(today, -13)
    const prevWeekEnd = addDays(today, -7)

    const [
      donations,
      enquiryCount,
      newEnquiryCount,
      volunteerCount,
      newVolunteerCount,
      articlesDoc,
      eventsDoc,
    ] = await Promise.all([
      Donation.find({ status: { $ne: 'cancelled' } }).sort({ donationDate: -1, createdAt: -1 }).lean(),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'new' }),
      Volunteer.countDocuments(),
      Volunteer.countDocuments({ status: 'new' }),
      getOrCreateBlog('blog-articles'),
      getOrCreateBlog('event-items'),
    ])

    const articles = Array.isArray(articlesDoc?.data?.items) ? articlesDoc.data.items : []
    const events = Array.isArray(eventsDoc?.data?.items) ? eventsDoc.data.items : []

    const totalDonationAmount = donations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const donorCount = donations.length

    const thisWeekDonations = donations.filter((item) => {
      const date = new Date(item.donationDate || item.createdAt)
      return date >= weekStart
    })
    const prevWeekDonations = donations.filter((item) => {
      const date = new Date(item.donationDate || item.createdAt)
      return date >= prevWeekStart && date < weekStart
    })

    const thisWeekAmount = thisWeekDonations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const prevWeekAmount = prevWeekDonations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

    const thisWeekDonors = thisWeekDonations.length
    const prevWeekDonors = prevWeekDonations.length

    const articlesActive = articles.filter((item) => item.isActive !== false)
    const eventsActive = events.filter((item) => item.isActive !== false)

    const recentArticleCutoff = addDays(today, -7)
    const recentArticles = articles.filter((item) => {
      const date = new Date(item.date || item.updatedAt || 0)
      return !Number.isNaN(date.getTime()) && date >= recentArticleCutoff
    }).length
    const upcomingEventsCount = eventsActive.filter((item) => {
      const date = startOfDay(new Date(item.date || 0))
      return !Number.isNaN(date.getTime()) && date >= today
    }).length

    const stats = [
      {
        id: 'donations',
        label: 'Total Donations',
        value: formatInr(totalDonationAmount),
        change: formatPercent(percentChange(thisWeekAmount, prevWeekAmount)),
        changeLabel: 'from last week',
        changeUp: thisWeekAmount >= prevWeekAmount,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        icon: 'handHeart',
      },
      {
        id: 'donors',
        label: 'Total Donors',
        value: String(donorCount),
        change: formatPercent(percentChange(thisWeekDonors, prevWeekDonors)),
        changeLabel: 'from last week',
        changeUp: thisWeekDonors >= prevWeekDonors,
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        icon: 'users',
      },
      {
        id: 'blogs',
        label: 'Total Blog Posts',
        value: String(articles.length),
        change: String(recentArticles),
        changeLabel: 'added this week',
        changeUp: true,
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        icon: 'newspaper',
      },
      {
        id: 'events',
        label: 'Total Events',
        value: String(eventsActive.length),
        change: String(upcomingEventsCount),
        changeLabel: 'upcoming',
        changeUp: true,
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        icon: 'calendar',
      },
      {
        id: 'enquiries',
        label: 'Total Enquiries',
        value: String(enquiryCount),
        change: String(newEnquiryCount),
        changeLabel: 'new unread',
        changeUp: true,
        iconBg: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        icon: 'mail',
      },
      {
        id: 'volunteers',
        label: 'Volunteers',
        value: String(volunteerCount),
        change: String(newVolunteerCount),
        changeLabel: 'new applications',
        changeUp: true,
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-600',
        icon: 'userPlus',
      },
    ]

    const donationTrend = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(weekStart, index)
      const next = addDays(day, 1)
      const amount = donations
        .filter((item) => {
          const date = new Date(item.donationDate || item.createdAt)
          return date >= day && date < next
        })
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      return {
        day: formatDayLabel(day),
        amount,
      }
    })

    const methodTotals = {}
    for (const item of donations) {
      const key = METHOD_META[item.method] ? item.method : 'other'
      methodTotals[key] = (methodTotals[key] || 0) + (Number(item.amount) || 0)
    }
    const methodSum = Object.values(methodTotals).reduce((sum, n) => sum + n, 0)
    const paymentMethods =
      methodSum > 0
        ? Object.entries(methodTotals)
            .map(([key, amount]) => ({
              label: METHOD_META[key].label,
              value: Math.round((amount / methodSum) * 100),
              color: METHOD_META[key].color,
              amount,
            }))
            .sort((a, b) => b.value - a.value)
        : Object.entries(METHOD_META)
            .slice(0, 4)
            .map(([, meta]) => ({
              label: meta.label,
              value: 0,
              color: meta.color,
              amount: 0,
            }))

    // No program field on donations yet — keep shape for UI with empty list.
    const topPrograms = []

    const recentDonations = donations.slice(0, 5).map((item, index) => ({
      id: item._id.toString(),
      name: item.name,
      method: methodLabel(item.method),
      amount: formatInr(item.amount),
      datetime: formatDateTime(item.donationDate || item.createdAt),
      status: statusLabel(item.status),
      initials: initialsFromName(item.name),
      avatarBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
    }))

    const upcomingEvents = eventsActive
      .filter((item) => {
        const date = startOfDay(new Date(item.date || 0))
        return !Number.isNaN(date.getTime()) && date >= today
      })
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
      .slice(0, 3)
      .map((item) => {
        const date = new Date(item.date)
        return {
          id: item.id || item.slug,
          day: Number.isNaN(date.getTime())
            ? '--'
            : date.toLocaleDateString('en-IN', { day: '2-digit' }),
          month: Number.isNaN(date.getTime())
            ? '—'
            : date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
          title: item.title || 'Untitled event',
          location: item.location || '—',
          time: item.time || '—',
        }
      })

    const recentBlogs = [...articles]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 3)
      .map((item) => ({
        id: item.id || item.slug,
        title: item.title || 'Untitled post',
        date: formatShortDate(item.date),
        status: item.isActive === false ? 'Draft' : 'Published',
        image: item.image || '',
        thumb: 'from-blue-400 to-navy',
      }))

    const dateRangeLabel = `${formatDayLabel(weekStart)} ${weekStart.getFullYear()} - ${formatDayLabel(today)} ${today.getFullYear()}`

    return res.json({
      success: true,
      data: {
        stats,
        donationTrend,
        paymentMethods,
        topPrograms,
        recentDonations,
        upcomingEvents,
        recentBlogs,
        dateRangeLabel,
        notificationCount: newEnquiryCount + newVolunteerCount,
        summary: {
          totalDonationAmount,
          donorCount,
          enquiryCount,
          newEnquiryCount,
          volunteerCount,
          newVolunteerCount,
          blogCount: articles.length,
          eventCount: eventsActive.length,
          thisWeekAmount,
          prevWeekAmount,
          prevWeekStart: prevWeekStart.toISOString(),
          prevWeekEnd: prevWeekEnd.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Dashboard load failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to load dashboard data.',
    })
  }
})

export default router
