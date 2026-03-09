import {
  ExternalLink,
  User,
  Building,
  CreditCard,
  FileText,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckSquare,
} from "lucide-react";
import { TaxData } from "../page";

interface ImportantLinksProps {
  data: TaxData;
}

interface ServiceLink {
  name: string;
  description: string;
  url: string;
  icon: React.ElementType;
  category: "quickbooks" | "payroll" | "irs" | "ca" | "tools";
}

interface Contact {
  name: string;
  role: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  priority: "primary" | "secondary";
}

const serviceLinks: ServiceLink[] = [
  // QuickBooks
  {
    name: "QuickBooks Online",
    description: "Bookkeeping & financial reports (Simple Start plan)",
    url: "https://qbo.intuit.com/app/homepage",
    icon: Building,
    category: "quickbooks"
  },
  
  // Payroll
  {
    name: "Gusto Dashboard",
    description: "Payroll management (AutoPilot enabled, biweekly)",
    url: "https://gusto.com/app",
    icon: CreditCard,
    category: "payroll"
  },
  
  // IRS Links
  {
    name: "Form 1120-S (S Corporation Return)",
    description: "S-Corp annual tax return form",
    url: "https://www.irs.gov/forms-pubs/about-form-1120-s",
    icon: FileText,
    category: "irs"
  },
  {
    name: "IRS Estimated Tax Payments",
    description: "Make quarterly estimated tax payments online",
    url: "https://www.irs.gov/payments/direct-pay",
    icon: CreditCard,
    category: "irs"
  },
  {
    name: "IRS Business Tax Calendar",
    description: "Important tax deadlines and due dates",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/tax-calendars",
    icon: Calendar,
    category: "irs"
  },
  {
    name: "IRS Form 941 (Quarterly Employment Tax)",
    description: "Quarterly payroll tax return",
    url: "https://www.irs.gov/forms-pubs/about-form-941",
    icon: FileText,
    category: "irs"
  },
  
  // California FTB
  {
    name: "CA FTB Web Pay",
    description: "California state tax payments",
    url: "https://webapp.ftb.ca.gov/webpay/",
    icon: CreditCard,
    category: "ca"
  },
  {
    name: "Form 100S (CA S Corporation Return)",
    description: "California S-Corp annual tax return",
    url: "https://www.ftb.ca.gov/forms/2023/2023-100s-instructions.pdf",
    icon: FileText,
    category: "ca"
  },
  {
    name: "CA Estimated Tax Vouchers",
    description: "California quarterly estimated tax payments",
    url: "https://www.ftb.ca.gov/pay/index.html",
    icon: FileText,
    category: "ca"
  },
  
  // Tools
  {
    name: "IRS Tax Withholding Estimator",
    description: "Calculate proper withholding amounts",
    url: "https://www.irs.gov/individuals/tax-withholding-estimator",
    icon: Building,
    category: "tools"
  },
  {
    name: "CA Tax Calculator",
    description: "California state tax calculator",
    url: "https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2024/tax-calculator.html",
    icon: Building,
    category: "tools"
  }
];

const documentChecklist = [
  { item: "QuickBooks P&L Statement", required: true, description: "Year-to-date profit & loss" },
  { item: "QuickBooks Balance Sheet", required: true, description: "End of year financial position" },
  { item: "Gusto Payroll Summary", required: true, description: "Officer salary & payroll taxes paid" },
  { item: "Form W-2 for Officers", required: true, description: "Salary and tax withholdings" },
  { item: "1099-NEC for Contractors", required: true, description: "Non-employee compensation issued" },
  { item: "Business Bank Statements", required: true, description: "December statement for year-end balance" },
  { item: "Depreciation Schedule", required: false, description: "Business equipment & assets" },
  { item: "Business Receipts", required: false, description: "Major expense receipts & documentation" },
  { item: "Prior Year Tax Returns", required: false, description: "For reference and carryover items" },
  { item: "Estimated Tax Payment Records", required: true, description: "Federal & CA quarterly payments made" },
];

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className={`bg-slate-800/30 rounded-xl p-4 border ${
      contact.priority === 'primary' 
        ? 'border-primary-500/30 bg-primary-900/10' 
        : 'border-slate-700/50'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100">{contact.name}</h3>
          <p className={`text-sm font-medium capitalize ${
            contact.priority === 'primary' ? 'text-primary-400' : 'text-slate-400'
          }`}>
            {contact.role}
          </p>
          {contact.company && (
            <p className="text-sm text-slate-500">{contact.company}</p>
          )}
        </div>
        {contact.priority === 'primary' && (
          <span className="px-2 py-1 bg-primary-900/30 text-primary-400 text-xs rounded-full border border-primary-500/30">
            Primary
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-slate-500" />
            <a 
              href={`mailto:${contact.email}`}
              className="text-slate-300 hover:text-primary-400 transition-colors"
            >
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-slate-500" />
            <a 
              href={`tel:${contact.phone}`}
              className="text-slate-300 hover:text-primary-400 transition-colors"
            >
              {contact.phone}
            </a>
          </div>
        )}
        {contact.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <p className="text-slate-300">{contact.address}</p>
          </div>
        )}
      </div>
      
      {contact.notes && (
        <div className="mt-3 p-3 bg-slate-900/30 rounded-lg">
          <p className="text-xs text-slate-400">{contact.notes}</p>
        </div>
      )}
    </div>
  );
}

function ServiceLinkCard({ link }: { link: ServiceLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-slate-800/30 hover:bg-slate-700/30 rounded-xl p-4 border border-slate-700/50 hover:border-primary-500/30 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <link.icon className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-100 group-hover:text-primary-400 transition-colors">
              {link.name}
            </h3>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">{link.description}</p>
        </div>
      </div>
    </a>
  );
}

export default function ImportantLinks({ data }: ImportantLinksProps) {
  // Convert data contacts to our Contact interface
  const contacts: Contact[] = data.contacts.map(contact => ({
    name: contact.name,
    role: contact.role,
    company: contact.company || undefined,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    address: contact.address || undefined,
    notes: contact.notes || undefined,
    priority: contact.role === 'accountant' ? 'primary' : 'secondary'
  }));

  // Add any missing essential contacts
  const essentialContacts = [
    {
      name: "QuickBooks Support",
      role: "bookkeeping support",
      company: "Intuit QuickBooks",
      phone: "1-800-446-8848",
      notes: "QuickBooks Online Simple Start plan support",
      priority: "secondary" as const
    },
    {
      name: "Gusto Support",
      role: "payroll support", 
      company: "Gusto",
      email: "support@gusto.com",
      notes: "AutoPilot biweekly payroll support",
      priority: "secondary" as const
    }
  ];

  const allContacts = [
    ...contacts,
    ...essentialContacts.filter(essential => 
      !contacts.some(contact => contact.role === essential.role)
    )
  ];

  const linksByCategory = {
    quickbooks: serviceLinks.filter(link => link.category === 'quickbooks'),
    payroll: serviceLinks.filter(link => link.category === 'payroll'),
    irs: serviceLinks.filter(link => link.category === 'irs'),
    ca: serviceLinks.filter(link => link.category === 'ca'),
    tools: serviceLinks.filter(link => link.category === 'tools'),
  };

  return (
    <div className="space-y-6">
      {/* Key Contacts */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-slate-100">Key Contacts</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allContacts
            .sort((a, b) => (a.priority === 'primary' ? -1 : 1))
            .map((contact, index) => (
            <ContactCard key={index} contact={contact} />
          ))}
        </div>
      </div>

      {/* QuickBooks & Payroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Building className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">QuickBooks</h2>
          </div>
          <div className="space-y-3">
            {linksByCategory.quickbooks.map((link, index) => (
              <ServiceLinkCard key={index} link={link} />
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">Payroll</h2>
          </div>
          <div className="space-y-3">
            {linksByCategory.payroll.map((link, index) => (
              <ServiceLinkCard key={index} link={link} />
            ))}
          </div>
        </div>
      </div>

      {/* Government Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">IRS (Federal)</h2>
          </div>
          <div className="space-y-3">
            {linksByCategory.irs.map((link, index) => (
              <ServiceLinkCard key={index} link={link} />
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">California FTB</h2>
          </div>
          <div className="space-y-3">
            {linksByCategory.ca.map((link, index) => (
              <ServiceLinkCard key={index} link={link} />
            ))}
          </div>
        </div>
      </div>

      {/* Tax Tools */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Building className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-slate-100">Tax Tools & Calculators</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {linksByCategory.tools.map((link, index) => (
            <ServiceLinkCard key={index} link={link} />
          ))}
        </div>
      </div>

      {/* Document Checklist for Tax Prep */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <CheckSquare className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-slate-100">Tax Prep Document Checklist</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {documentChecklist.map((doc, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/30 rounded-lg">
              <div className={`w-4 h-4 rounded border-2 mt-1 ${
                doc.required 
                  ? 'border-red-400 bg-red-400/20' 
                  : 'border-slate-600 bg-slate-800/50'
              }`}>
                {doc.required && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${doc.required ? 'text-slate-100' : 'text-slate-300'}`}>
                  {doc.item}
                  {doc.required && <span className="text-red-400 ml-1">*</span>}
                </h3>
                <p className="text-sm text-slate-400 mt-1">{doc.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <span className="font-medium">Pro tip:</span> Gather all required documents (*) before scheduling 
            your tax prep meeting with Nick Jackson. This will ensure a smooth and efficient filing process.
          </p>
        </div>
      </div>
    </div>
  );
}