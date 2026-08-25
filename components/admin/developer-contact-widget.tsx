"use client";

export function DeveloperContactWidget() {
  return (
    <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">N</div>
        <div>
          <h3 className="font-bold text-gray-900">Nader Soft for Technical Services</h3>
          <p className="text-sm text-gray-600">Developer / Nader Batash</p>
        </div>
      </div>

      <div className="space-y-2">
        <a href="tel:+967777250138" className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 border">
          Direct Call: +967 777 250 138
        </a>

        <a
          href="https://wa.me/967777250138?text=Hello%20Nader%20I%20need%20help%20with%20Alola%20Logistics%20system"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-600"
        >
          WhatsApp: +967 777 250 138
        </a>

        <a href="mailto:NADRSOFT2@GMAIL.COM?subject=Support%20-%20Alola%20Logistics" className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 border">
          NADRSOFT2@GMAIL.COM
        </a>
      </div>

      <div className="mt-3 rounded bg-blue-100/70 p-2.5 text-xs text-blue-800">
        For technical support, updates, and new features, contact the developer directly.
      </div>
    </div>
  );
}
