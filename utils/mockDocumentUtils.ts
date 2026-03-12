
export const generateFakeDL = (name: string, location: string, photo?: string) => {
    const dlNumber = `DL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const expiryDate = "15/08/2032";
    const dob = "10/05/1992";

    return `
    <div style="width: 100%; max-width: 500px; aspect-ratio: 1.6/1; background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%); border-radius: 20px; padding: 20px; color: #102a43; font-family: 'Inter', sans-serif; position: relative; border: 1px solid #bcccdc; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: rgba(255,255,255,0.2); border-radius: 50%; blur: 40px;"></div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #334e68; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="font-size: 24px;">🇮🇳</div>
          <div>
            <h1 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Republic of India</h1>
            <p style="margin: 0; font-size: 10px; font-weight: 700; color: #486581;">Driving License</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98;">LICENSE NO.</p>
          <p style="margin: 0; font-size: 14px; font-weight: 900; color: #102a43;">${dlNumber}</p>
        </div>
      </div>

      <div style="display: flex; gap: 20px;">
        <div style="width: 100px; height: 120px; background: #9fb3c8; border-radius: 12px; border: 2px solid #fff; overflow: hidden; display: flex; items-center; justify-center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${photo ? `<img src="${photo}" style="width: 100%; h-full: object-cover;" />` : `<div style="font-size: 40px; opacity: 0.5;">👤</div>`}
        </div>
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="grid-column: span 2;">
            <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Name</p>
            <p style="margin: 0; font-size: 16px; font-weight: 900; color: #102a43;">${name}</p>
          </div>
          <div>
             <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">DOB</p>
             <p style="margin: 0; font-size: 12px; font-weight: 700;">${dob}</p>
          </div>
          <div>
             <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Valid Till</p>
             <p style="margin: 0; font-size: 12px; font-weight: 700; color: #d64545;">${expiryDate}</p>
          </div>
          <div style="grid-column: span 2;">
            <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Address</p>
            <p style="margin: 0; font-size: 10px; font-weight: 600; line-height: 1.2;">${location}</p>
          </div>
        </div>
      </div>
      
      <div style="position: absolute; bottom: 15px; right: 20px;">
        <div style="width: 80px; height: 30px; border-bottom: 2px solid #334e68; display: flex; items-end; justify-center; font-family: 'Dancing Script', cursive; font-size: 14px; color: #334e68;">
          ${name.split(' ')[0]}
        </div>
        <p style="margin: 5px 0 0 0; font-size: 7px; font-weight: 900; text-align: center; color: #627d98; text-transform: uppercase;">Signature</p>
      </div>
      
      <div style="position: absolute; bottom: 10px; left: 20px; display: flex; gap: 5px;">
        <div style="width: 20px; height: 12px; background: #e12d39; border-radius: 2px;"></div>
        <div style="width: 20px; height: 12px; background: #fff; border-radius: 2px;"></div>
        <div style="width: 20px; height: 12px; background: #1a5e20; border-radius: 2px;"></div>
      </div>
    </div>
  `;
};

export const generateFakeRC = (name: string, vehicleNo: string, vehicleType: string, location: string) => {
    const rcNumber = `RC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const regDate = "12/03/2021";

    return `
    <div style="width: 100%; max-width: 500px; aspect-ratio: 1.6/1; background: linear-gradient(135deg, #f7f9fb 0%, #f0f4f8 100%); border-radius: 20px; padding: 20px; color: #102a43; font-family: 'Inter', sans-serif; position: relative; border: 1px solid #bcccdc; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="position: absolute; top: -40px; left: -40px; width: 120px; height: 120px; background: rgba(51, 78, 104, 0.05); border-radius: 50%; blur: 30px;"></div>
      
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #9fb3c8; padding-bottom: 10px;">
        <h1 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Registration Certificate</h1>
        <p style="margin: 0; font-size: 10px; font-weight: 700; color: #486581;">Ministry of Road Transport & Highways</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="grid-column: span 2;">
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Owner Name</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #102a43;">${name}</p>
        </div>
        
        <div>
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Vehicle Number</p>
          <p style="margin: 0; font-size: 14px; font-weight: 900; color: #243b53;">${vehicleNo || "MH 12 AB 1234"}</p>
        </div>
        
        <div>
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">RC Number</p>
          <p style="margin: 0; font-size: 14px; font-weight: 900; color: #243b53;">${rcNumber}</p>
        </div>
        
        <div>
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Vehicle Class</p>
          <p style="margin: 0; font-size: 12px; font-weight: 700;">${vehicleType || "LMV"}</p>
        </div>
        
        <div>
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Reg. Date</p>
          <p style="margin: 0; font-size: 12px; font-weight: 700;">${regDate}</p>
        </div>
        
        <div style="grid-column: span 2;">
          <p style="margin: 0; font-size: 8px; font-weight: 900; color: #627d98; text-transform: uppercase;">Address</p>
          <p style="margin: 0; font-size: 10px; font-weight: 600;">${location}</p>
        </div>
      </div>
      
      <div style="position: absolute; bottom: 20px; right: 20px;">
        <div style="width: 50px; height: 50px; border: 2px solid #334e68; border-radius: 50%; display: flex; items-center; justify-center; font-size: 8px; font-weight: 900; text-align: center; color: #334e68; padding: 5px; opacity: 0.7;">
          GOVERNMENT STAMP
        </div>
      </div>
    </div>
  `;
};
