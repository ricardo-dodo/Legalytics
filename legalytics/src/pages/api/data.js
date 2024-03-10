export default function handler(req, res) {
    if (req.method === 'POST') {
      // Proses data yang diterima
      const data = req.body;
      // Simpan, proses, atau langsung kirimkan balik data sebagai respons
      res.status(200).json({ message: "Data diterima", data });
    } else {
      // Handle any other HTTP method
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }
  