-- ==========================================================
-- مشروع VISION collection — Retro Digi Watches
-- كود إعداد قاعدة البيانات لـ Supabase SQL Editor (مُصحح)
-- ==========================================================

-- 1. إنشاء جدول المنشورات (posts)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2),
    tag TEXT DEFAULT 'Retro digi',
    media_urls TEXT[] NOT NULL DEFAULT '{}',
    media_types TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- التثبت من وجود عمود tag في حال وجود الجدول سابقاً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'tag'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN tag TEXT DEFAULT 'Retro digi';
    END IF;
END $$;

-- 2. دالة ومحفز (Trigger) لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. تفعيل وحماية الصفوف (RLS) لجدول المنشورات
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active posts" ON public.posts;
DROP POLICY IF EXISTS "Public can select all posts" ON public.posts;
DROP POLICY IF EXISTS "Public can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Public can update posts" ON public.posts;
DROP POLICY IF EXISTS "Public can delete posts" ON public.posts;

CREATE POLICY "Public can select all posts"
    ON public.posts FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert posts"
    ON public.posts FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can update posts"
    ON public.posts FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete posts"
    ON public.posts FOR DELETE TO public USING (true);

-- 4. إدراج بيانات اولية للمتجر عند الفراغ
INSERT INTO public.posts (title, description, price, tag, media_urls, media_types, is_active)
SELECT 
    'Sabrina Steel Edition',
    'تصميم رقمي كلاسيكي مستوحى من حقبة الألفينات (2000s). هيكل مصقول من الستانلس ستيل المقاوم للصدأ مع شاشة رقمية شبكية البكسلات عالية التباين، مدمجة ببراعة ودقة كوارتز سويسرية فائقة.\n\nالمواصفات:\n- مقاومة للماء حتى عمق 50 متراً\n- زجاج معدني صلب مقاوم للخدش\n- إضاءة شاشة زرقاء نيون أيقونية\n- تنسيق 24 ساعة وساعة إيقاف وتقويم رقمي',
    780.00,
    'Retro digi',
    ARRAY['images/sabrina.png', 'photos/5947419537978364127_121.jpg', 'photos/5947419537978364128_121.jpg'],
    ARRAY['image', 'image', 'image'],
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.posts WHERE title = 'Sabrina Steel Edition');

INSERT INTO public.posts (title, description, price, tag, media_urls, media_types, is_active)
SELECT 
    'Naomi Crimson Dial',
    'إصدار Naomi الحصري بمينا رقمي أحمر جريء وإطار فولاذي مصفح. تجمع بين الدقة العالية لتقنية الكوارتز والطابع الرقمي الرياضي المستوحى من تصاميم السايبربانك العصرية.\n\nالمواصفات:\n- شاشة رقمية حمراء عالية الوضوح تحت أشعة الشمس\n- حزام من الفولاذ المقاوم للصدأ مع قفل أمان مزدوج\n- توقيت مزدوج ومنبه يومي ذكي\n- تصميم خفيف ومريح للاستخدام اليومي',
    640.00,
    'Bestseller',
    ARRAY['images/naomi.jpg', 'photos/5947419537978364132_121.jpg', 'photos/5947419537978364133_121.jpg'],
    ARRAY['image', 'image', 'image'],
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.posts WHERE title = 'Naomi Crimson Dial');

INSERT INTO public.posts (title, description, price, tag, media_urls, media_types, is_active)
SELECT 
    'Chrono Matrix 2000',
    'الجيل الأحدث من تشكيلة VISION. هيكل معدني ثقيل مع أزرار تشغيل كرومية بارزة، وشاشة متعددة النوافذ تعرض أجزاء الثانية، التوقيت العالمي، واليوم والتاريخ.\n\nالمواصفات:\n- هيكل فولاذي صلب مصقول يدوياً\n- شاشة كريستال متعددة التقسيمات مع مؤشرات تفاعلية\n- مقاومة للصدمات والماء 50M\n- بطارية طويلة العمر تصل إلى 5 سنوات',
    820.00,
    'New Arrival',
    ARRAY['photos/Picsart_26-10-17_13-27-12-392.png', 'photos/5947419537978364135_121.jpg', 'photos/5947419537978364136_121.jpg'],
    ARRAY['image', 'image', 'image'],
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.posts WHERE title = 'Chrono Matrix 2000');

-- 5. إنشاء جدول الطلبات (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    post_title TEXT NOT NULL,
    post_price NUMERIC(10, 2),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_city TEXT,
    customer_email TEXT,
    selected_color TEXT DEFAULT 'الافتراضي',
    order_notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل RLS لجدول الطلبات
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- سياسات جدول الطلبات المكتملة (شاملة الحذف)
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can select orders" ON public.orders;
DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
DROP POLICY IF EXISTS "Public can delete orders" ON public.orders;

CREATE POLICY "Public can insert orders"
    ON public.orders FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can select orders"
    ON public.orders FOR SELECT TO public USING (true);

CREATE POLICY "Public can update orders"
    ON public.orders FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete orders"
    ON public.orders FOR DELETE TO public USING (true);

-- محفز تحديث updated_at للطلبات
DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();