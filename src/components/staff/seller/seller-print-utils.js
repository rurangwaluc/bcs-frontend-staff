export function printHtmlDocument({ title, content }) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;

  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111827;
          }
          .doc {
            max-width: 900px;
            margin: 0 auto;
          }
          .head {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 2px solid #111827;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: 800;
          }
          .muted {
            color: #6b7280;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: left;
            font-size: 13px;
          }
          th {
            background: #f3f4f6;
          }
          .summary {
            margin-top: 20px;
            width: 320px;
            margin-left: auto;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 50px;
          }
          .sign-box {
            padding-top: 40px;
            border-top: 1px solid #111827;
            font-size: 13px;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
  return true;
}
