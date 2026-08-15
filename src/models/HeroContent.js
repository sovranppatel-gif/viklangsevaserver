import mongoose from 'mongoose'

const heroContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'home-hero',
      unique: true,
      immutable: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imageAlt: { type: String, default: '', trim: true },
    imageAltHi: { type: String, default: '', trim: true },
    eyebrow: { type: String, default: '', trim: true },
    eyebrowHi: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    titleHi: { type: String, default: '', trim: true },
    headline: { type: String, default: '', trim: true },
    headlineHi: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    descriptionHi: { type: String, default: '', trim: true },
    primaryCtaLabel: { type: String, default: 'Donate Now', trim: true },
    primaryCtaLabelHi: { type: String, default: 'अभी दान करें', trim: true },
    primaryCtaLink: { type: String, default: '/donate?amount=1000&method=upi', trim: true },
    secondaryCtaLabel: { type: String, default: 'See lives changed →', trim: true },
    secondaryCtaLabelHi: { type: String, default: 'बदली ज़िंदगियाँ देखें →', trim: true },
    secondaryCtaLink: { type: String, default: '/impact/stories', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const DEFAULT_HERO_CONTENT = {
  key: 'home-hero',
  imageUrl:
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1800&q=80',
  imageAlt: 'Community care supporting persons with disabilities at Viklang Sewa Sansthan',
  imageAltHi: 'विकलांग सेवा संस्थान में दिव्यांगजनों के साथ सामुदायिक देखभाल',
  eyebrow: 'Empowering Lives. Creating Possibilities.',
  eyebrowHi: 'जीवन को सशक्त बनाना। संभावनाएँ रचना।',
  title: 'Viklang Sewa Sansthan',
  titleHi: 'विकलांग सेवा संस्थान',
  headline: 'One gift. One child. One new chance — in Narsinghpur.',
  headlineHi: 'एक दान। एक बच्चा। एक नया मौका — नरसिंहपुर में।',
  description:
    '500+ lives supported through education, rehabilitation and inclusion. Your donation goes directly to programs — with 80G receipt.',
  descriptionHi:
    'शिक्षा, पुनर्वास और समावेशन से 500+ जीवन समर्थित। आपका दान सीधे कार्यक्रमों तक — 80G रसीद के साथ।',
  primaryCtaLabel: 'Donate Now',
  primaryCtaLabelHi: 'अभी दान करें',
  primaryCtaLink: '/donate?amount=1000&method=upi',
  secondaryCtaLabel: 'See lives changed →',
  secondaryCtaLabelHi: 'बदली ज़िंदगियाँ देखें →',
  secondaryCtaLink: '/impact/stories',
  isActive: true,
}

export const HeroContent = mongoose.model('HeroContent', heroContentSchema)
