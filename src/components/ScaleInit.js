"use client";
import { useEffect } from "react";

export default function ScaleInit() {
  useEffect(() => {
    function applyScale() {
      var baseWidth = 1485;
      var scale = window.innerWidth / baseWidth;
      document.documentElement.style.zoom = scale;
      var realVh = (window.innerHeight / scale) * 0.01;
      document.documentElement.style.setProperty('--real-vh', realVh + 'px');
    }
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, []);

  return null;
}