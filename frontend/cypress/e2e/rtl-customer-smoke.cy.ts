describe('Customer RTL smoke (Arabic)', () => {
  const viewports: Array<{ label: string; width: number; height: number }> = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'tablet', width: 1024, height: 768 },
    { label: 'mobile', width: 390, height: 844 },
  ];

  const setArabicLocale = (win: Window) => {
    win.localStorage.setItem('shielder_locale', 'ar');
    win.localStorage.setItem('shielder_cart', JSON.stringify([]));
    win.sessionStorage.removeItem('shielder_access_token');
    win.sessionStorage.removeItem('shielder_refresh_token');
  };

  const mockPrivacyPolicy = () => {
    cy.intercept('GET', '**/privacy-policy*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          contentEn: '<h2>Privacy</h2><p>English policy</p>',
          contentAr: '<h2>سياسة الخصوصية</h2><p>نلتزم بحماية بياناتك الشخصية.</p><ol><li>الجمع</li><li>الاستخدام</li></ol>',
          updatedAt: '2026-05-20T00:00:00.000Z',
        },
      },
    }).as('privacyPolicy');
  };

  const mockProducts = () => {
    cy.intercept('GET', '**/inventory/categories*', {
      statusCode: 200,
      body: {
        categories: [{ id: 'cat-1', name: 'Industrial Filters' }],
      },
    }).as('categories');

    cy.intercept('GET', '**/inventory/products/p-1*', {
      statusCode: 200,
      body: {
        data: {
          id: 'p-1',
          name: 'Demo Filter',
          nameAr: 'فلتر تجريبي',
          description: 'Demo description',
          descriptionAr: 'وصف المنتج التجريبي',
          price: 125,
          originalPrice: 150,
          mainImage: null,
          categoryId: 'cat-1',
          categoryName: 'Industrial Filters',
          stock: 7,
          sku: 'SKU-001',
          filterType: 'Air',
          material: 'Polyester',
          dimensions: '10x20',
          attachments: [],
          translations: [{ locale: 'ar', name: 'فلتر تجريبي', description: 'وصف المنتج التجريبي' }],
        },
      },
    }).as('productDetail');

    cy.intercept('GET', '**/inventory/products*', (req) => {
      // Related products request from product detail page
      if (req.url.includes('categoryId=cat-1') && req.url.includes('limit=4')) {
        req.reply({
          statusCode: 200,
          body: {
            products: [
              {
                id: 'p-2',
                name: 'Related Filter',
                nameAr: 'فلتر مرتبط',
                price: 90,
                mainImage: null,
                categoryId: 'cat-1',
                stock: 3,
              },
            ],
          },
        });
        return;
      }

      // Products listing page
      req.reply({
        statusCode: 200,
        body: {
          products: [
            {
              id: 'p-1',
              name: 'Demo Filter',
              nameAr: 'فلتر تجريبي',
              description: 'Demo description',
              descriptionAr: 'وصف المنتج التجريبي',
              price: 125,
              originalPrice: 150,
              mainImage: null,
              categoryName: 'Industrial Filters',
              stock: 7,
              sku: 'SKU-001',
              translations: [{ locale: 'ar', name: 'فلتر تجريبي', description: 'وصف المنتج التجريبي' }],
            },
          ],
          pagination: { total: 1, page: 1, limit: 12, pages: 1 },
        },
      });
    }).as('productsList');
  };

  viewports.forEach((vp) => {
    context(`RTL ${vp.label}`, () => {
      beforeEach(() => {
        cy.viewport(vp.width, vp.height);
        mockPrivacyPolicy();
        mockProducts();
      });

      it('renders Privacy Policy in RTL with right aligned Arabic content', () => {
        cy.visit('/privacy-policy', {
          onBeforeLoad: setArabicLocale,
        });

        cy.wait('@privacyPolicy');
        cy.get('html').should('have.attr', 'dir', 'rtl');
        cy.get('html').should('have.attr', 'lang', 'ar');
        cy.contains('سياسة الخصوصية').should('be.visible');
        cy.get('main .rtl-prose').should('exist').and('have.attr', 'dir', 'rtl');
      });

      it('renders Products listing in RTL with right aligned card content', () => {
        cy.visit('/products', {
          onBeforeLoad: setArabicLocale,
        });

        cy.wait('@categories');
        cy.wait('@productsList');

        cy.get('html').should('have.attr', 'dir', 'rtl');
        cy.contains('فلتر تجريبي').should('be.visible');
        cy.get('input[placeholder]').first().should('have.class', 'text-right');
        cy.get('main [role="button"]').first().within(() => {
          cy.get('div').contains('فلتر تجريبي').should('be.visible');
        });
      });

      it('renders Product detail in RTL with Arabic layout alignment', () => {
        cy.visit('/products/p-1', {
          onBeforeLoad: setArabicLocale,
        });

        cy.wait('@productDetail');
        cy.wait('@productsList');

        cy.get('html').should('have.attr', 'dir', 'rtl');
        cy.contains('فلتر تجريبي').should('be.visible');
        cy.get('main').within(() => {
          cy.contains('فلتر تجريبي').should('be.visible');
          cy.get('button').contains(/Add to Cart|أضف/).should('be.visible');
        });
      });

      it('renders Cart in RTL with Arabic direction and item rows', () => {
        cy.visit('/cart', {
          onBeforeLoad: (win) => {
            setArabicLocale(win);
            win.localStorage.setItem(
              'shielder_cart',
              JSON.stringify([
                {
                  productId: 'p-1',
                  quantity: 2,
                  priceAtTime: 125,
                  product: {
                    id: 'p-1',
                    name: 'فلتر تجريبي',
                    thumbnail: null,
                    stock: 7,
                  },
                },
              ])
            );
          },
        });

        cy.get('html').should('have.attr', 'dir', 'rtl');
        cy.contains('فلتر تجريبي').should('be.visible');
        cy.get('main').find('div[dir="rtl"]').should('exist');
      });
    });
  });
});
