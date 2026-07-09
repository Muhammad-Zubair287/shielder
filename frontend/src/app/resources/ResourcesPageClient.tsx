'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileQuestion,
  FileText,
  Headphones,
  LifeBuoy,
  LocateFixed,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';
import { getImageUrl } from '@/utils/helpers';
import settingsService from '@/services/settings.service';
import apiClient from '@/services/api.service';

type ResourceDocument = {
  id: string;
  title: string;
  category: string;
  href?: string;
  source: 'backend' | 'placeholder';
};

type SearchableResource = {
  type: string;
  title: string;
  body: string;
  target: string;
  faqKey?: string;
};

type PublicSettings = {
  company_email?: string;
  company_phone?: string;
  company_location_en?: string;
  company_location_ar?: string;
  company_address?: string;
  working_hours?: string;
  business_hours?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLocationEn?: string;
  companyLocationAr?: string;
  companyAddress?: string;
  workingHours?: string;
  businessHours?: string;
};

type ProductAttachmentResponse = {
  id?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
};

type ProductResourceResponse = {
  id?: string;
  name?: string;
  categoryName?: string;
  category?: {
    name?: string;
  };
  attachments?: ProductAttachmentResponse[];
};

const categoryCards = [
  {
    id: 'technical-data-sheets',
    title: 'Technical Data Sheets',
    description: 'Product-level specifications, construction details, and filtration performance data.',
    icon: FileText,
  },
  {
    id: 'installation-guides',
    title: 'Installation Guides',
    description: 'Step-by-step procedures for replacing and maintaining SHIELDER filters.',
    icon: Wrench,
  },
  {
    id: 'customer-support',
    title: 'Customer Support Resources',
    description: 'Selection guides, manuals, catalog resources, and cross-reference support.',
    icon: LifeBuoy,
  },
  {
    id: 'warranty-information',
    title: 'Warranty Information',
    description: 'Coverage, claim process, product eligibility, and warranty exclusions.',
    icon: ShieldCheck,
  },
  {
    id: 'returns-claims',
    title: 'Returns & Claims Procedure',
    description: 'A clear workflow for support requests, inspections, approvals, and resolutions.',
    icon: RotateCcw,
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions (FAQ)',
    description: 'Answers to common product, technical, shipping, warranty, and support questions.',
    icon: FileQuestion,
  },
  {
    id: 'technical-support',
    title: 'Contact Technical Support',
    description: 'Reach the SHIELDER team for part verification, application guidance, and support.',
    icon: Headphones,
  },
  {
    id: 'distributor-locator',
    title: 'Distributor Locator',
    description: 'Find help locating an authorized SHIELDER distributor for your region.',
    icon: LocateFixed,
  },
];

const placeholderDocuments: ResourceDocument[] = [
  { id: 'air-filter-tds', title: 'Air Filter Technical Data Sheet', category: 'Air Filters', source: 'placeholder' },
  { id: 'oil-filter-tds', title: 'Oil Filter Technical Data Sheet', category: 'Oil Filters', source: 'placeholder' },
  { id: 'fuel-filter-tds', title: 'Fuel Filter Technical Data Sheet', category: 'Fuel Filters', source: 'placeholder' },
  { id: 'hydraulic-filter-tds', title: 'Hydraulic Filter Technical Data Sheet', category: 'Hydraulic Filters', source: 'placeholder' },
  { id: 'cabin-filter-tds', title: 'Cabin Filter Technical Data Sheet', category: 'Cabin Filters', source: 'placeholder' },
  { id: 'coolant-filter-tds', title: 'Coolant Filter Technical Data Sheet', category: 'Coolant Filters', source: 'placeholder' },
];

const installationGuides = [
  {
    title: 'Air Filter Installation',
    description: 'Inspection, seal checks, housing cleaning, and final fitment validation for intake systems.',
    image: '332x192 air filter.png',
  },
  {
    title: 'Fuel Filter Replacement',
    description: 'Safe replacement sequence, priming notes, leak checks, and contamination prevention.',
    image: 'filter image 2.png',
  },
  {
    title: 'Hydraulic Filter Installation',
    description: 'Pressure-side precautions, oil cleanliness checks, and post-installation monitoring.',
    image: 'Hydrulic Filter.png',
  },
  {
    title: 'Generator Filter Maintenance',
    description: 'Preventive maintenance guidance for generators operating in demanding environments.',
    image: 'power generation.png',
  },
];

const supportResources = [
  { title: 'Product Selection Guide', description: 'Choose the right filter by equipment, environment, and duty cycle.', icon: SlidersHorizontal },
  { title: 'Maintenance Tips', description: 'Extend service life with practical inspection and replacement habits.', icon: Settings },
  { title: 'Filter Cross Reference', description: 'Verify equivalent part numbers and replacement options.', icon: ClipboardCheck },
  { title: 'Product Catalog', description: 'Browse available SHIELDER product families and categories.', icon: BookOpen },
  { title: 'User Manuals', description: 'Reference operational guidance for product handling and care.', icon: FileCheck2 },
];

const warrantyCards = [
  {
    title: 'Warranty Coverage',
    description: 'Coverage applies to eligible SHIELDER products used under recommended operating conditions.',
    icon: ShieldCheck,
  },
  {
    title: 'Warranty Period',
    description: 'Warranty duration is determined by product family, use case, and documented purchase terms.',
    icon: Clock3,
  },
  {
    title: "What's Covered",
    description: 'Manufacturing defects, material defects, and verified performance issues may qualify.',
    icon: CheckCircle2,
  },
  {
    title: "What's Not Covered",
    description: 'Incorrect installation, misuse, contamination, modified parts, or undocumented operating damage.',
    icon: PackageCheck,
  },
  {
    title: 'Claim Process',
    description: 'Submit supporting information so the team can inspect, validate, and resolve the claim.',
    icon: BadgeCheck,
  },
];

const claimSteps = [
  {
    title: 'Contact Support',
    description: 'Share product details, application, issue description, and available purchase information.',
  },
  {
    title: 'Submit Claim',
    description: 'Provide photos, operating conditions, and the part number so the case can be reviewed.',
  },
  {
    title: 'Product Inspection',
    description: 'The technical team inspects the product condition and validates installation and use.',
  },
  {
    title: 'Approval',
    description: 'Eligible claims are approved according to warranty policy and documented findings.',
  },
  {
    title: 'Replacement / Resolution',
    description: 'The support team coordinates the approved replacement, credit, or recommended resolution.',
  },
];

const faqGroups = [
  {
    category: 'General',
    items: [
      {
        question: 'What types of filters does SHIELDER manufacture?',
        answer: 'SHIELDER offers a complete range of filtration products including Air Filters, Oil Filters, Fuel Filters, Hydraulic Filters, Cabin Filters, and Coolant Filters for heavy-duty equipment and engines.',
      },
      {
        question: 'Which industries do your filters serve?',
        answer: 'Our filters are designed for generator sets, heavy-duty trucks, construction equipment, mining machinery, agricultural equipment, industrial engines, marine applications, and material handling equipment.',
      },
      {
        question: 'How do I find the correct filter for my equipment?',
        answer: 'You can search by equipment model, engine model, OEM part number, or use our Cross Reference tool to identify the correct replacement filter.',
      },
      {
        question: 'Are SHIELDER filters compatible with OEM equipment?',
        answer: 'Yes. Our filters are designed to meet or exceed OEM specifications and are compatible with a wide range of engines and equipment.',
      },
      {
        question: 'Can SHIELDER filters replace OEM filter brands?',
        answer: 'Yes. Many SHIELDER filters are direct replacements for leading OEM and aftermarket filter brands while maintaining high filtration performance.',
      },
      {
        question: 'What are the benefits of using high-quality filters?',
        answer: 'High-quality filters help:\n\nExtend engine life\nImprove fuel efficiency\nReduce maintenance costs\nProtect critical engine components\nMaximize equipment uptime',
      },
      {
        question: 'How often should filters be replaced?',
        answer: 'Replacement intervals depend on equipment type, operating conditions, and manufacturer recommendations. Always follow the equipment maintenance schedule.',
      },
      {
        question: 'Do you offer filters for diesel generators?',
        answer: 'Yes. We provide filtration solutions for a wide range of diesel generator engines used in standby, prime, and continuous power applications.',
      },
      {
        question: 'Do you provide filters for heavy equipment and trucks?',
        answer: 'Yes. We supply filters for construction machinery, mining equipment, agricultural machinery, and commercial trucks.',
      },
      {
        question: 'What quality standards do SHIELDER filters follow?',
        answer: 'Our products undergo strict quality control and performance testing to ensure durability, reliability, and consistent filtration efficiency.',
      },
      {
        question: 'How can I verify a filter part number?',
        answer: 'You can contact our technical support team or use our Cross Reference section to verify compatibility and equivalent part numbers.',
      },
      {
        question: 'Do you provide bulk orders and distributor support?',
        answer: 'Yes. We support distributors, dealers, fleet operators, generator manufacturers, and industrial customers worldwide.',
      },
      {
        question: 'Do your filters come with a warranty?',
        answer: 'Yes. SHIELDER products are backed by a warranty against manufacturing defects. Please refer to our Warranty Policy for details.',
      },
      {
        question: 'How can I become a SHIELDER distributor?',
        answer: 'Visit our Contact Us page and submit your company information. Our sales team will review your application and contact you.',
      },
      {
        question: 'How can I contact technical support?',
        answer: 'You can reach our technical support team through our Contact Us page, email, or telephone for assistance with filter selection and product inquiries.',
      },
    ],
  },
  {
    category: 'Technical Questions',
    items: [
      {
        question: 'What is filtration efficiency?',
        answer: 'Filtration efficiency describes how effectively a filter removes particles of a specific size from air, fuel, oil, coolant, or hydraulic fluid.',
      },
      {
        question: 'What is micron rating?',
        answer: 'Micron rating indicates the particle size a filter media is designed to capture. Lower micron values generally represent finer filtration.',
      },
      {
        question: 'What happens if I use the wrong filter?',
        answer: 'An incorrect filter can cause poor sealing, restricted flow, contamination bypass, pressure issues, or component damage.',
      },
      {
        question: 'Can clogged filters damage an engine?',
        answer: 'Yes. Restricted filtration can reduce flow, increase stress on systems, lower performance, and contribute to premature equipment wear.',
      },
    ],
  },
  {
    category: 'Ordering & Shipping',
    items: [
      {
        question: 'Do you ship internationally?',
        answer: 'International availability depends on product, order quantity, and destination. Contact the SHIELDER team for regional support.',
      },
      {
        question: 'What are your delivery times?',
        answer: 'Delivery times vary by location, stock availability, and logistics method. The sales team can confirm estimates for your order.',
      },
      {
        question: 'Can I track my order?',
        answer: 'Tracking availability depends on the selected logistics provider. Contact support with your order reference for status updates.',
      },
    ],
  },
  {
    category: 'Warranty & Returns',
    items: [
      {
        question: 'What is your return policy?',
        answer: 'Returns are reviewed case by case based on product condition, purchase verification, and whether the item is eligible for return.',
      },
      {
        question: 'How do I submit a warranty claim?',
        answer: 'Warranty claims require product information, issue details, supporting photos, and review by the technical support team.',
      },
      {
        question: 'What information is required for a claim?',
        answer: 'Submit product details, issue description, supporting photos, and any available purchase information to help the team review your claim efficiently.',
      },
    ],
  },
];

const normalize = (value: string) => value.toLowerCase().trim();

const arText: Record<string, string> = {
  'Technical Data Sheets': 'نشرات البيانات الفنية',
  'Product-level specifications, construction details, and filtration performance data.': 'مواصفات المنتجات وتفاصيل التصنيع وبيانات أداء الترشيح.',
  'Installation Guides': 'أدلة التركيب',
  'Step-by-step procedures for replacing and maintaining SHIELDER filters.': 'إرشادات خطوة بخطوة لاستبدال وصيانة فلاتر شيلدر.',
  'Customer Support Resources': 'موارد دعم العملاء',
  'Selection guides, manuals, catalog resources, and cross-reference support.': 'أدلة اختيار وكتيبات وكتالوجات ودعم للمراجع البديلة.',
  'Warranty Information': 'معلومات الضمان',
  'Coverage, claim process, product eligibility, and warranty exclusions.': 'التغطية وإجراءات المطالبة وأهلية المنتج واستثناءات الضمان.',
  'Returns & Claims Procedure': 'إجراءات الإرجاع والمطالبات',
  'A clear workflow for support requests, inspections, approvals, and resolutions.': 'مسار واضح لطلبات الدعم والفحص والموافقة والحلول.',
  'Frequently Asked Questions (FAQ)': 'الأسئلة الشائعة',
  'Answers to common product, technical, shipping, warranty, and support questions.': 'إجابات عن أسئلة المنتجات والجوانب الفنية والشحن والضمان والدعم.',
  'Contact Technical Support': 'تواصل مع الدعم الفني',
  'Reach the SHIELDER team for part verification, application guidance, and support.': 'تواصل مع فريق شيلدر للتحقق من القطع وإرشادات الاستخدام والدعم.',
  'Distributor Locator': 'محدد الموزعين',
  'Find help locating an authorized SHIELDER distributor for your region.': 'احصل على مساعدة للعثور على موزع شيلدر معتمد في منطقتك.',
  'Air Filter Technical Data Sheet': 'نشرة البيانات الفنية لفلتر الهواء',
  'Oil Filter Technical Data Sheet': 'نشرة البيانات الفنية لفلتر الزيت',
  'Fuel Filter Technical Data Sheet': 'نشرة البيانات الفنية لفلتر الوقود',
  'Hydraulic Filter Technical Data Sheet': 'نشرة البيانات الفنية للفلتر الهيدروليكي',
  'Cabin Filter Technical Data Sheet': 'نشرة البيانات الفنية لفلتر المقصورة',
  'Coolant Filter Technical Data Sheet': 'نشرة البيانات الفنية لفلتر سائل التبريد',
  'Air Filters': 'فلاتر الهواء',
  'Oil Filters': 'فلاتر الزيت',
  'Fuel Filters': 'فلاتر الوقود',
  'Hydraulic Filters': 'الفلاتر الهيدروليكية',
  'Cabin Filters': 'فلاتر المقصورة',
  'Coolant Filters': 'فلاتر سائل التبريد',
  'Air Filter Installation': 'تركيب فلتر الهواء',
  'Inspection, seal checks, housing cleaning, and final fitment validation for intake systems.': 'فحص الفلتر والتحقق من الإحكام وتنظيف الحاوية والتأكد من التركيب النهائي لأنظمة السحب.',
  'Fuel Filter Replacement': 'استبدال فلتر الوقود',
  'Safe replacement sequence, priming notes, leak checks, and contamination prevention.': 'خطوات استبدال آمنة وملاحظات التحضير وفحص التسرب ومنع التلوث.',
  'Hydraulic Filter Installation': 'تركيب الفلتر الهيدروليكي',
  'Pressure-side precautions, oil cleanliness checks, and post-installation monitoring.': 'احتياطات جانب الضغط وفحص نظافة الزيت والمراقبة بعد التركيب.',
  'Generator Filter Maintenance': 'صيانة فلاتر المولدات',
  'Preventive maintenance guidance for generators operating in demanding environments.': 'إرشادات صيانة وقائية للمولدات العاملة في بيئات قاسية.',
  'Product Selection Guide': 'دليل اختيار المنتج',
  'Choose the right filter by equipment, environment, and duty cycle.': 'اختر الفلتر المناسب حسب المعدة والبيئة ودورة التشغيل.',
  'Maintenance Tips': 'نصائح الصيانة',
  'Extend service life with practical inspection and replacement habits.': 'أطل عمر الخدمة من خلال عادات فحص واستبدال عملية.',
  'Filter Cross Reference': 'مراجع الفلاتر البديلة',
  'Verify equivalent part numbers and replacement options.': 'تحقق من أرقام القطع المكافئة وخيارات الاستبدال.',
  'Product Catalog': 'كتالوج المنتجات',
  'Browse available SHIELDER product families and categories.': 'تصفح عائلات وفئات منتجات شيلدر المتاحة.',
  'User Manuals': 'أدلة المستخدم',
  'Reference operational guidance for product handling and care.': 'راجع إرشادات التشغيل للتعامل مع المنتج والعناية به.',
  'Warranty Coverage': 'تغطية الضمان',
  'Coverage applies to eligible SHIELDER products used under recommended operating conditions.': 'تنطبق التغطية على منتجات شيلدر المؤهلة عند استخدامها ضمن ظروف التشغيل الموصى بها.',
  'Warranty Period': 'مدة الضمان',
  'Warranty duration is determined by product family, use case, and documented purchase terms.': 'تحدد مدة الضمان حسب عائلة المنتج وطريقة الاستخدام وشروط الشراء الموثقة.',
  "What's Covered": 'ما الذي يشمله الضمان',
  'Manufacturing defects, material defects, and verified performance issues may qualify.': 'قد تشمل التغطية عيوب التصنيع وعيوب المواد ومشكلات الأداء المثبتة.',
  "What's Not Covered": 'ما الذي لا يشمله الضمان',
  'Incorrect installation, misuse, contamination, modified parts, or undocumented operating damage.': 'لا يشمل الضمان التركيب الخاطئ أو سوء الاستخدام أو التلوث أو القطع المعدلة أو أضرار التشغيل غير الموثقة.',
  'Claim Process': 'إجراءات المطالبة',
  'Submit supporting information so the team can inspect, validate, and resolve the claim.': 'قدّم المعلومات الداعمة ليتمكن الفريق من الفحص والتحقق وحل المطالبة.',
  'Contact Support': 'تواصل مع الدعم',
  'Share product details, application, issue description, and available purchase information.': 'شارك تفاصيل المنتج والاستخدام ووصف المشكلة ومعلومات الشراء المتاحة.',
  'Submit Claim': 'تقديم المطالبة',
  'Provide photos, operating conditions, and the part number so the case can be reviewed.': 'قدّم الصور وظروف التشغيل ورقم القطعة حتى تتم مراجعة الحالة.',
  'Product Inspection': 'فحص المنتج',
  'The technical team inspects the product condition and validates installation and use.': 'يفحص الفريق الفني حالة المنتج ويتحقق من التركيب والاستخدام.',
  'Approval': 'الموافقة',
  'Eligible claims are approved according to warranty policy and documented findings.': 'تتم الموافقة على المطالبات المؤهلة حسب سياسة الضمان والنتائج الموثقة.',
  'Replacement / Resolution': 'الاستبدال أو الحل',
  'The support team coordinates the approved replacement, credit, or recommended resolution.': 'ينسق فريق الدعم الاستبدال المعتمد أو الرصيد أو الحل الموصى به.',
  'Products': 'المنتجات',
  'Technical': 'فني',
  'Warranty': 'الضمان',
  'Support': 'الدعم',
  'General': 'عام',
  'Technical Questions': 'أسئلة فنية',
  'Warranty & Returns': 'الضمان والإرجاع',
  'What types of filters does SHIELDER manufacture?': 'ما أنواع الفلاتر التي تصنعها شيلدر؟',
  'SHIELDER offers a complete range of filtration products including Air Filters, Oil Filters, Fuel Filters, Hydraulic Filters, Cabin Filters, and Coolant Filters for heavy-duty equipment and engines.': 'تقدم شيلدر مجموعة كاملة من منتجات الترشيح بما في ذلك فلاتر الهواء وفلاتر الزيت وفلاتر الوقود والفلاتر الهيدروليكية وفلاتر المقصورة وفلاتر سائل التبريد للمعدات الثقيلة والمحركات.',
  'Which industries do your filters serve?': 'ما الصناعات التي تخدمها فلاتركم؟',
  'Our filters are designed for generator sets, heavy-duty trucks, construction equipment, mining machinery, agricultural equipment, industrial engines, marine applications, and material handling equipment.': 'تم تصميم فلاترنا لمجموعات المولدات والشاحنات الثقيلة ومعدات البناء والآلات التعدين ومعدات الزراعة والمحركات الصناعية والتطبيقات البحرية ومعدات التعامل مع المواد.',
  'How do I find the correct filter for my equipment?': 'كيف أجد الفلتر الصحيح لمعدتي؟',
  'You can search by equipment model, engine model, OEM part number, or use our Cross Reference tool to identify the correct replacement filter.': 'يمكنك البحث حسب موديل المعدة أو موديل المحرك أو رقم قطعة المصنع الأصلي أو استخدام أداة المراجع البديلة لتحديد الفلتر البديل الصحيح.',
  'Are SHIELDER filters compatible with OEM equipment?': 'هل فلاتر شيلدر متوافقة مع معدات المصنع الأصلي؟',
  'Yes. Our filters are designed to meet or exceed OEM specifications and are compatible with a wide range of engines and equipment.': 'نعم. تم تصميم فلاترنا لتلبية أو تجاوز مواصفات المصنع الأصلي وهي متوافقة مع مجموعة واسعة من المحركات والمعدات.',
  'Can SHIELDER filters replace OEM filter brands?': 'هل يمكن لفلاتر شيلدر استبدال علامات فلاتر المصنع الأصلي؟',
  'Yes. Many SHIELDER filters are direct replacements for leading OEM and aftermarket filter brands while maintaining high filtration performance.': 'نعم. العديد من فلاتر شيلدر هي بدائل مباشرة لعلامات فلاتر المصنع الأصلي الرائدة والعلامات التجارية البديلة مع الحفاظ على أداء ترشيح عالي.',
  'What are the benefits of using high-quality filters?': 'ما هي فوائد استخدام الفلاتر عالية الجودة؟',
  'High-quality filters help:\n\nExtend engine life\nImprove fuel efficiency\nReduce maintenance costs\nProtect critical engine components\nMaximize equipment uptime': 'تساعد الفلاتر عالية الجودة على:\n\nإطالة عمر المحرك\nتحسين كفاءة الوقود\nتقليل تكاليف الصيانة\nحماية مكونات المحرك الحرجة\nتعظيم وقت تشغيل المعدات',
  'How often should filters be replaced?': 'كم مرة يجب استبدال الفلاتر؟',
  'Replacement intervals depend on equipment type, operating conditions, and manufacturer recommendations. Always follow the equipment maintenance schedule.': 'تعتمد فترات الاستبدال على نوع المعدة وظروف التشغيل وتوصيات الشركة المصنعة. اتبع دائمًا جدول صيانة المعدة.',
  'Do you offer filters for diesel generators?': 'هل تقدمون فلاتر للمولدات الديزل؟',
  'Yes. We provide filtration solutions for a wide range of diesel generator engines used in standby, prime, and continuous power applications.': 'نعم. نقدم حلول ترشيح لمجموعة واسعة من محركات المولدات الديزل المستخدمة في تطبيقات الطاقة الاحتياطية والرئيسية والمستمرة.',
  'Do you provide filters for heavy equipment and trucks?': 'هل تقدمون فلاتر للمعدات الثقيلة والشاحنات؟',
  'Yes. We supply filters for construction machinery, mining equipment, agricultural machinery, and commercial trucks.': 'نعم. نورد فلاتر لآلات البناء ومعدات التعدين والآلات الزراعية والشاحنات التجارية.',
  'What quality standards do SHIELDER filters follow?': 'ما معايير الجودة التي تتبعها فلاتر شيلدر؟',
  'Our products undergo strict quality control and performance testing to ensure durability, reliability, and consistent filtration efficiency.': 'تخضع منتجاتنا لمراقبة جودة صارمة واختبارات أداء لضمان المتانة والموثوقية وكفاءة ترشيح متسقة.',
  'How can I verify a filter part number?': 'كيف يمكنني التحقق من رقم قطعة الفلتر؟',
  'You can contact our technical support team or use our Cross Reference section to verify compatibility and equivalent part numbers.': 'يمكنك الاتصال بفريق الدعم الفني لدينا أو استخدام قسم المراجع البديلة للتحقق من التوافق وأرقام القطع المكافئة.',
  'Do you provide bulk orders and distributor support?': 'هل تقدمون طلبات بالجملة ودعم للموزعين؟',
  'Yes. We support distributors, dealers, fleet operators, generator manufacturers, and industrial customers worldwide.': 'نعم. ندعم الموزعين والوكلاء ومشغلي الأساطل ومصنعي المولدات والعملاء الصناعيين في جميع أنحاء العالم.',
  'Do your filters come with a warranty?': 'هل تأتي فلاتركم مع ضمان؟',
  'Yes. SHIELDER products are backed by a warranty against manufacturing defects. Please refer to our Warranty Policy for details.': 'نعم. منتجات شيلدر مدعومة بضمان ضد عيوب التصنيع. يرجى الرجوع إلى سياسة الضمان لدينا للحصول على التفاصيل.',
  'How can I become a SHIELDER distributor?': 'كيف يمكنني أن أصبح موزعًا لشيلدر؟',
  'Visit our Contact Us page and submit your company information. Our sales team will review your application and contact you.': 'قم بزيارة صفحة تواصل معنا وأرسل معلومات شركتك. سيقوم فريق المبيعات بمراجعة طلبك والتواصل معك.',
  'How can I contact technical support?': 'كيف يمكنني التواصل مع الدعم الفني؟',
  'You can reach our technical support team through our Contact Us page, email, or telephone for assistance with filter selection and product inquiries.': 'يمكنك الوصول إلى فريق الدعم الفني لدينا من خلال صفحة تواصل معنا أو البريد الإلكتروني أو الهاتف للحصول على مساعدة في اختيار الفلاتر والاستفسارات عن المنتجات.',
  'What is filtration efficiency?': 'ما هي كفاءة الترشيح؟',
  'Filtration efficiency describes how effectively a filter removes particles of a specific size from air, fuel, oil, coolant, or hydraulic fluid.': 'تصف كفاءة الترشيح مدى فعالية الفلتر في إزالة جسيمات بحجم محدد من الهواء أو الوقود أو الزيت أو سائل التبريد أو السائل الهيدروليكي.',
  'What is micron rating?': 'ما هو تصنيف الميكرون؟',
  'Micron rating indicates the particle size a filter media is designed to capture. Lower micron values generally represent finer filtration.': 'يشير تصنيف الميكرون إلى حجم الجسيمات التي صُمم وسيط الفلترة لالتقاطها. القيم الأقل تعني عادة ترشيحًا أدق.',
  'Can clogged filters damage an engine?': 'هل يمكن للفلاتر المسدودة إتلاف المحرك؟',
  'Yes. Restricted filtration can reduce flow, increase stress on systems, lower performance, and contribute to premature equipment wear.': 'نعم. يمكن لتقييد التدفق أن يقلل الأداء ويزيد الضغط على الأنظمة ويساهم في تآكل مبكر للمعدات.',
  'What happens if I use the wrong filter?': 'ماذا يحدث إذا استخدمت فلترًا غير مناسب؟',
  'An incorrect filter can cause poor sealing, restricted flow, contamination bypass, pressure issues, or component damage.': 'قد يسبب الفلتر غير المناسب ضعف الإحكام أو تقييد التدفق أو مرور التلوث أو مشكلات ضغط أو تلف المكونات.',
  'Do you ship internationally?': 'هل تشحنون دوليًا؟',
  'International availability depends on product, order quantity, and destination. Contact the SHIELDER team for regional support.': 'يعتمد توفر الشحن الدولي على المنتج وكمية الطلب والوجهة. تواصل مع فريق شيلدر للدعم الإقليمي.',
  'What are delivery times?': 'ما أوقات التسليم؟',
  'Delivery times vary by location, stock availability, and logistics method. The sales team can confirm estimates for your order.': 'تختلف أوقات التسليم حسب الموقع وتوفر المخزون وطريقة الشحن. يمكن لفريق المبيعات تأكيد التقديرات لطلبك.',
  'Can I track my order?': 'هل يمكنني تتبع طلبي؟',
  'Tracking availability depends on the selected logistics provider. Contact support with your order reference for status updates.': 'يعتمد توفر التتبع على مزود الشحن المختار. تواصل مع الدعم برقم طلبك لمعرفة الحالة.',
  'Do products include warranty?': 'هل تشمل المنتجات ضمانًا؟',
  'Eligible SHIELDER products include warranty coverage subject to the applicable terms, usage conditions, and claim validation.': 'تشمل منتجات شيلدر المؤهلة تغطية ضمان وفقًا للشروط المعمول بها وظروف الاستخدام والتحقق من المطالبة.',
  'Return policy?': 'ما سياسة الإرجاع؟',
  'Returns are reviewed case by case based on product condition, purchase verification, and whether the item is eligible for return.': 'تتم مراجعة الإرجاع حسب كل حالة بناءً على حالة المنتج والتحقق من الشراء وأهلية المنتج للإرجاع.',
  'Warranty claims?': 'كيف تتم مطالبات الضمان؟',
  'Warranty claims require product information, issue details, supporting photos, and review by the technical support team.': 'تتطلب مطالبات الضمان معلومات المنتج وتفاصيل المشكلة وصورًا داعمة ومراجعة من فريق الدعم الفني.',
  'How do I find the correct filter?': 'كيف أجد الفلتر الصحيح؟',
  'Use the part number, equipment model, application details, and current filter reference to confirm the correct replacement.': 'استخدم رقم القطعة وموديل المعدة وتفاصيل التطبيق ومرجع الفلتر الحالي لتأكيد البديل الصحيح.',
  'How do I verify a part number?': 'كيف أتحقق من رقم القطعة؟',
  'Share the part number with technical support so the team can validate fitment, specifications, and replacement options.': 'شارك رقم القطعة مع الدعم الفني ليتمكن الفريق من التحقق من الملاءمة والمواصفات وخيارات الاستبدال.',
  'How can I become a distributor?': 'كيف يمكنني أن أصبح موزعًا؟',
  'Contact the sales team through the distributor section to discuss regional coverage, product categories, and partnership requirements.': 'تواصل مع فريق المبيعات من قسم الموزعين لمناقشة التغطية الإقليمية وفئات المنتجات ومتطلبات الشراكة.',
  'SHIELDER Knowledge Center': 'مركز معرفة شيلدر',
  'Resources Center': 'مركز الموارد',
  'Technical documentation, installation guides, warranty information, FAQs, and support resources to help you get the most from SHIELDER products.': 'وثائق فنية وأدلة تركيب ومعلومات ضمان وأسئلة شائعة وموارد دعم تساعدك على تحقيق أفضل استفادة من منتجات شيلدر.',
  'Browse Resources': 'تصفح الموارد',
  'Search resources, FAQ, guides, warranty, documents...': 'ابحث في الموارد والأسئلة الشائعة والأدلة والضمان والمستندات...',
  'Section': 'القسم',
  'Document': 'مستند',
  'Guide': 'دليل',
  'Resource': 'مورد',
  'View section': 'عرض القسم',
  'Documentation': 'الوثائق',
  'Download technical references for SHIELDER product categories and backend-managed product data sheets.': 'حمّل المراجع الفنية لفئات منتجات شيلدر ونشرات البيانات المدارة من النظام.',
  'Download': 'تحميل',
  'Installation': 'التركيب',
  'Professional guide cards for common filter replacement and maintenance workflows.': 'بطاقات إرشادية احترافية لعمليات استبدال وصيانة الفلاتر الشائعة.',
  'Download PDF': 'تحميل PDF',
  'Support Library': 'مكتبة الدعم',
  'Helpful reference tools for product selection, maintenance planning, manuals, and cross references.': 'أدوات مرجعية مفيدة لاختيار المنتج وتخطيط الصيانة والأدلة والمراجع البديلة.',
  'Clear, premium warranty guidance organized into practical cards for fast scanning.': 'إرشادات ضمان واضحة ومنظمة في بطاقات عملية سهلة القراءة.',
  'Submit Warranty Claim': 'تقديم مطالبة ضمان',
  'Claims Workflow': 'مسار المطالبات',
  'A structured process that keeps warranty and return reviews clear from first contact through resolution.': 'عملية منظمة تجعل مراجعة الضمان والإرجاع واضحة من أول تواصل حتى الحل.',
  'Knowledge Base': 'قاعدة المعرفة',
  'Searchable, categorized answers for products, technical topics, orders, warranty, and support.': 'إجابات مصنفة وقابلة للبحث عن المنتجات والمواضيع الفنية والطلبات والضمان والدعم.',
  'common questions': 'أسئلة شائعة',
  'Technical Support': 'الدعم الفني',
  'Contact details are loaded from Company Settings so the customer site stays aligned with admin-managed information.': 'يتم تحميل بيانات التواصل من إعدادات الشركة ليبقى موقع العملاء متوافقًا مع المعلومات التي يديرها المسؤول.',
  'Email': 'البريد الإلكتروني',
  'Phone': 'الهاتف',
  'Office Address': 'عنوان المكتب',
  'Working Hours': 'ساعات العمل',
  'Managed in Company Settings': 'تتم إدارته من إعدادات الشركة',
  'Email Support': 'راسل الدعم',
  'Call Support': 'اتصل بالدعم',
  'Contact Us': 'تواصل معنا',
  'Need application help?': 'هل تحتاج مساعدة في التطبيق؟',
  'Send the equipment model, existing part number, and operating environment so technical support can guide the correct replacement.': 'أرسل موديل المعدة ورقم القطعة الحالي وبيئة التشغيل ليتمكن الدعم الفني من إرشادك إلى البديل الصحيح.',
  'Looking for an Authorized Distributor?': 'هل تبحث عن موزع معتمد؟',
  'Our distributor network is continuously expanding. Contact our sales team to locate your nearest SHIELDER distributor.': 'شبكة موزعينا تتوسع باستمرار. تواصل مع فريق المبيعات لمعرفة أقرب موزع شيلدر إليك.',
  'Find Distributor': 'ابحث عن موزع',
};

const localize = (value: string, isRTL: boolean) => (isRTL ? arText[value] || value : value);

export default function ResourcesPageClient() {
  const { isRTL } = useLanguage();
  const l = useCallback((value: string) => localize(value, isRTL), [isRTL]);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState('Products-0');
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [backendDocuments, setBackendDocuments] = useState<ResourceDocument[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    settingsService
      .getPublicSettings()
      .then((response) => {
        if (!active) return;
        setSettings(response.data?.data ?? response.data ?? null);
      })
      .catch(() => {
        if (active) setSettings(null);
      });

    apiClient
      .get('inventory/products?limit=60')
      .then((response) => {
        if (!active) return;
        const products: ProductResourceResponse[] = response.data?.products ?? response.data?.data ?? [];
        const documents = products.flatMap((product) => {
          const attachments = Array.isArray(product?.attachments) ? product.attachments : [];
          return attachments
            .filter((attachment) => attachment?.type === 'DATASHEET' && attachment?.fileUrl)
            .map((attachment) => ({
              id: attachment.id || `${product.id}-${attachment.fileName}`,
              title: attachment.fileName || `${product.name || 'Product'} Data Sheet`,
              category: product.categoryName || product.category?.name || 'Product Documentation',
              href: getImageUrl(attachment.fileUrl) || attachment.fileUrl,
              source: 'backend' as const,
            }));
        });
        setBackendDocuments(documents.slice(0, 8));
      })
      .catch(() => {
        if (active) setBackendDocuments([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const documents = backendDocuments.length > 0 ? backendDocuments : placeholderDocuments;
  const contactEmail = settings?.company_email || settings?.companyEmail || '';
  const contactPhone = settings?.company_phone || settings?.companyPhone || '';
  const contactAddress = isRTL
    ? settings?.company_location_ar || settings?.companyLocationAr || settings?.company_address || settings?.companyAddress || ''
    : settings?.company_location_en || settings?.companyLocationEn || settings?.company_address || settings?.companyAddress || '';
  const workingHours = settings?.working_hours || settings?.workingHours || settings?.business_hours || settings?.businessHours || '';

  const searchText = normalize(query);
  const searchableItems = useMemo<SearchableResource[]>(
    () => [
      ...categoryCards.map((item) => ({ type: l('Section'), title: l(item.title), body: l(item.description), target: item.id })),
      ...documents.map((item) => ({ type: l('Document'), title: l(item.title), body: l(item.category), target: 'technical-data-sheets' })),
      ...installationGuides.map((item) => ({ type: l('Guide'), title: l(item.title), body: l(item.description), target: 'installation-guides' })),
      ...supportResources.map((item) => ({ type: l('Resource'), title: l(item.title), body: l(item.description), target: 'customer-support' })),
      ...warrantyCards.map((item) => ({ type: l('Warranty'), title: l(item.title), body: l(item.description), target: 'warranty-information' })),
      ...faqGroups.flatMap((group) =>
        group.items.map((item, index) => ({
          type: l(group.category),
          title: l(item.question),
          body: l(item.answer),
          target: 'faq',
          faqKey: `${group.category}-${index}`,
        }))
      ),
    ],
    [documents, l]
  );

  const searchResults = searchText
    ? searchableItems.filter((item) => normalize(`${item.type} ${item.title} ${item.body}`).includes(searchText)).slice(0, 8)
    : [];

  const introStyle = (delayMs: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translate3d(0, 0, 0)' : 'translate3d(0, 14px, 0)',
    transition: 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: `${delayMs}ms`,
  });

  const scrollToSection = (id: string, faqKey?: string) => {
    if (faqKey) setOpenFaq(faqKey);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="overflow-hidden">
      <section className="relative mt-[112px] min-h-[560px] overflow-hidden bg-[#0A1E36]">
        <Image
          src="/images/landing/industrial.png"
          alt="Industrial filtration resources"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1E36]/95 via-[#0A1E36]/78 to-[#0A1E36]/38" />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 min-h-[560px] flex items-center">
          <div className={`max-w-3xl py-20 ${isRTL ? 'text-right' : 'text-left'}`}>
            <span style={introStyle(40)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.4px] text-white ring-1 ring-white/20">
              <BookOpen size={15} />
              {l('SHIELDER Knowledge Center')}
            </span>
            <h1 style={introStyle(100)} className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              {l('Resources Center')}
            </h1>
            <p style={introStyle(160)} className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-200">
              {l('Technical documentation, installation guides, warranty information, FAQs, and support resources to help you get the most from SHIELDER products.')}
            </p>
            <div style={introStyle(220)} className="mt-8">
              <button
                type="button"
                onClick={() => scrollToSection('resource-categories')}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#123C9C] px-7 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0D2F8C] hover:shadow-xl"
              >
                {l('Browse Resources')}
                <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="resource-categories" className="scroll-mt-36 bg-white py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal delayMs={30} threshold={0.12} durationMs={900}>
            <div className="relative -mt-28 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl sm:p-6 lg:p-8">
              <div className="relative">
                <Search size={20} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={l('Search resources, FAQ, guides, warranty, documents...')}
                  className={`h-14 w-full rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-[#0A1E36] outline-none transition-colors focus:border-[#123C9C] focus:bg-white ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                />
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.type}-${result.title}-${index}`}
                      type="button"
                      onClick={() => scrollToSection(result.target, result.faqKey)}
                      className={`rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#123C9C]/30 hover:shadow-md ${isRTL ? 'text-right' : ''}`}
                    >
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.4px] text-[#123C9C]">{l(result.type)}</span>
                      <p className="mt-1 text-sm font-bold text-[#0A1E36]">{l(result.title)}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{l(result.body)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categoryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <ScrollReveal key={card.id} delayMs={index * 45} threshold={0.12} durationMs={850}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(card.id)}
                    className={`group flex h-full min-h-[220px] w-full flex-col rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-[#123C9C]/30 hover:shadow-2xl ${isRTL ? 'text-right' : ''}`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#123C9C] text-white shadow-lg shadow-blue-900/20">
                      <Icon size={24} strokeWidth={1.7} />
                    </span>
                    <span className="mt-5 text-lg font-extrabold text-[#0A1E36]">{l(card.title)}</span>
                    <span className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{l(card.description)}</span>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#123C9C]">
                      {l('View section')}
                      <ArrowRight size={16} className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                    </span>
                  </button>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <SectionShell id="technical-data-sheets" eyebrow="Documentation" title="Technical Data Sheets" description="Download technical references for SHIELDER product categories and backend-managed product data sheets." tone="light">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} isRTL={isRTL} />
          ))}
        </div>
      </SectionShell>

      <SectionShell id="installation-guides" eyebrow="Installation" title="Installation Guides" description="Professional guide cards for common filter replacement and maintenance workflows." tone="white">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {installationGuides.map((guide) => (
            <div key={guide.title} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="relative h-40 bg-gray-100">
                <Image
                  src={`/images/landing/${guide.image}`}
                  alt={guide.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1E36]/55 to-transparent" />
              </div>
              <div className={`p-5 ${isRTL ? 'text-right' : ''}`}>
                <h3 className="text-lg font-extrabold text-[#0A1E36]">{l(guide.title)}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-relaxed text-gray-600">{l(guide.description)}</p>
                <Link href="/contact" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#123C9C] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0D2F8C]">
                  <Download size={16} />
                  {l('Download PDF')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="customer-support" eyebrow="Support Library" title="Customer Support Resources" description="Helpful reference tools for product selection, maintenance planning, manuals, and cross references." tone="light">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {supportResources.map((resource) => {
            const Icon = resource.icon;
            return (
              <div key={resource.title} className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isRTL ? 'text-right' : ''}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#123C9C]">
                  <Icon size={23} strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 text-base font-extrabold text-[#0A1E36]">{l(resource.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{l(resource.description)}</p>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell id="warranty-information" eyebrow="Warranty" title="Warranty Information" description="Clear, premium warranty guidance organized into practical cards for fast scanning." tone="white">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {warrantyCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isRTL ? 'text-right' : ''}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1E36] text-white">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 text-base font-extrabold text-[#0A1E36]">{l(card.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{l(card.description)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8">
          <Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#123C9C] px-7 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0D2F8C] hover:shadow-xl">
            {l('Submit Warranty Claim')}
            <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
          </Link>
        </div>
      </SectionShell>

      <SectionShell id="returns-claims" eyebrow="Claims Workflow" title="Returns & Claims Procedure" description="A structured process that keeps warranty and return reviews clear from first contact through resolution." tone="dark">
        <div className="grid gap-5 lg:grid-cols-5">
          {claimSteps.map((step, index) => (
            <div key={step.title} className="relative">
              {index < claimSteps.length - 1 && (
                <div className={`hidden lg:block absolute top-8 h-0.5 w-full bg-white/20 ${isRTL ? 'right-1/2' : 'left-1/2'}`} />
              )}
              <div className={`relative z-10 rounded-2xl border border-white/10 bg-white/10 p-6 text-white backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 ${isRTL ? 'text-right' : ''}`}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[#123C9C] shadow-xl">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-extrabold">{l(step.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/72">{l(step.description)}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="faq" eyebrow="Knowledge Base" title="Frequently Asked Questions (FAQ)" description="Searchable, categorized answers for products, technical topics, orders, warranty, and support." tone="light">
        <div className="grid gap-6 lg:grid-cols-5">
          {faqGroups.map((group) => (
            <div key={group.category} className="lg:col-span-1 flex">
              <div className="sticky top-32 flex w-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-lg">
                <h3 className="text-lg font-extrabold leading-tight text-[#0A1E36]">{l(group.category)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{group.items.length} {l('common questions')}</p>
              </div>
            </div>
          ))}
          <div className="space-y-4 lg:col-span-4">
            {faqGroups.flatMap((group) =>
              group.items.map((item, index) => {
                const key = `${group.category}-${index}`;
                const isOpen = openFaq === key;
                return (
                  <div key={key} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-shadow hover:shadow-lg">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? '' : key)}
                      className={`flex w-full items-center justify-between gap-5 p-5 text-left ${isRTL ? 'text-right' : ''}`}
                      aria-expanded={isOpen}
                    >
                      <span>
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.4px] text-[#123C9C]">{l(group.category)}</span>
                        <span className="mt-1 block text-base font-extrabold text-[#0A1E36]">{l(item.question)}</span>
                      </span>
                      <ChevronDown size={20} className={`flex-shrink-0 text-[#123C9C] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <p className={`border-t border-gray-100 px-5 pb-5 pt-4 text-sm leading-relaxed text-gray-600 ${isRTL ? 'text-right' : ''}`}>
                          {l(item.answer)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SectionShell>

      <SectionShell id="technical-support" eyebrow="Technical Support" title="Contact Technical Support" description="Contact details are loaded from Company Settings so the customer site stays aligned with admin-managed information." tone="white">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={`rounded-2xl border border-gray-100 bg-white p-7 shadow-xl lg:col-span-2 ${isRTL ? 'text-right' : ''}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ContactInfo icon={Mail} label="Email" value={contactEmail || 'Managed in Company Settings'} />
              <ContactInfo icon={Phone} label="Phone" value={contactPhone || 'Managed in Company Settings'} />
              <ContactInfo icon={MapPin} label="Office Address" value={contactAddress || 'Managed in Company Settings'} />
              <ContactInfo icon={Clock3} label="Working Hours" value={workingHours || 'Managed in Company Settings'} />
            </div>
            <div className={`mt-8 flex flex-wrap gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <a
                href={contactEmail ? `mailto:${contactEmail}` : undefined}
                aria-disabled={!contactEmail}
                className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold transition-colors ${contactEmail ? 'bg-[#123C9C] text-white hover:bg-[#0D2F8C]' : 'pointer-events-none bg-gray-100 text-gray-400'}`}
              >
                <Mail size={16} />
                {l('Email Support')}
              </a>
              <a
                href={contactPhone ? `tel:${contactPhone}` : undefined}
                aria-disabled={!contactPhone}
                className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold transition-colors ${contactPhone ? 'bg-[#0A1E36] text-white hover:bg-[#123C9C]' : 'pointer-events-none bg-gray-100 text-gray-400'}`}
              >
                <Phone size={16} />
                {l('Call Support')}
              </a>
              <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 text-sm font-bold text-[#0A1E36] transition-colors hover:border-[#123C9C]/30 hover:text-[#123C9C]">
                <Headphones size={16} />
                {l('Contact Us')}
              </Link>
            </div>
          </div>
          <div className={`rounded-2xl bg-[#0A1E36] p-7 text-white shadow-xl ${isRTL ? 'text-right' : ''}`}>
            <Building2 size={34} className="text-white/80" />
            <h3 className="mt-5 text-2xl font-extrabold">{l('Need application help?')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              {l('Send the equipment model, existing part number, and operating environment so technical support can guide the correct replacement.')}
            </p>
          </div>
        </div>
      </SectionShell>

      <section id="distributor-locator" className="scroll-mt-36 bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal delayMs={30} threshold={0.12} durationMs={900}>
            <div className="bg-gradient-to-r from-[#0A1E36] to-[#123C9C] rounded-3xl p-12 lg:p-16 text-center relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}></div>
              </div>

              {/* Content */}
              <div className={`relative z-10 max-w-2xl ${isRTL ? 'text-right' : 'text-left'}`}>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.4px] ring-1 ring-white/20">
                  <LocateFixed size={15} />
                  {l('Distributor Locator')}
                </span>
                <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                  {l('Looking for an Authorized Distributor?')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white">
                  {l('Our distributor network is continuously expanding. Contact our sales team to locate your nearest SHIELDER distributor.')}
                </p>
                <Link href="/contact" className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-7 text-sm font-bold text-[#123C9C] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
                  {l('Find Distributor')}
                  <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  tone,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: 'white' | 'light' | 'dark';
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  const l = (value: string) => localize(value, isRTL);
  const dark = tone === 'dark';
  const background = dark ? 'bg-[#0A1E36]' : tone === 'light' ? 'bg-gray-50' : 'bg-white';

  return (
    <ScrollReveal className={background} delayMs={30} threshold={0.12} durationMs={900}>
      <section id={id} className="scroll-mt-36 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`mb-12 max-w-3xl ${isRTL ? 'text-right' : ''}`}>
            <p className={`text-xs font-extrabold uppercase tracking-[0.5px] ${dark ? 'text-blue-200' : 'text-[#123C9C]'}`}>{l(eyebrow)}</p>
            <h2 className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${dark ? 'text-white' : 'text-[#0A1E36]'}`}>{l(title)}</h2>
            <p className={`mt-4 text-base leading-relaxed ${dark ? 'text-white/70' : 'text-gray-600'}`}>{l(description)}</p>
          </div>
          {children}
        </div>
      </section>
    </ScrollReveal>
  );
}

function DocumentCard({ doc, isRTL }: { doc: ResourceDocument; isRTL: boolean }) {
  const l = (value: string) => localize(value, isRTL);
  const content = (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <FileText size={24} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-[#0A1E36]">{l(doc.title)}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.35px] text-gray-400">{l(doc.category)}</p>
      </div>
      <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123C9C] px-4 text-xs font-bold text-white transition-colors group-hover:bg-[#0D2F8C]">
        <Download size={15} />
        {l('Download')}
      </span>
    </>
  );

  if (doc.href) {
    return (
      <a
        href={doc.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href="/contact"
      className={`group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}
    >
      {content}
    </Link>
  );
}

function ContactInfo({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  const { isRTL } = useLanguage();
  const l = (text: string) => localize(text, isRTL);

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#123C9C] shadow-sm">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.4px] text-gray-400">{l(label)}</p>
      <p className="mt-1 break-words text-sm font-bold leading-relaxed text-[#0A1E36]">{l(value)}</p>
    </div>
  );
}
