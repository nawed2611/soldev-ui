import { NextSeoProps } from "next-seo";
import DefaultLayout from "@/layouts/default";
import styles from "@/styles/core/sidebar.module.css";
import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";

import heroStyles from "@/styles/PageHero.module.css";
import PageHero from "@/components/core/PageHero";

import subnavStyles from "@/styles/core/subnav.module.css";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid";

import { SIMDAuthorLineItem } from "@/components/simd/SIMDTableLineItem";
import NextPrevButtons from "@/components/core/NextPrevButtons";
import { fetchAllSIMD } from "@/utils/fetch-simd";
import { computeSlugForSIMD, shareOnTwitterUrl } from "@/utils/helpers";
import { fetchRaw } from "@/utils/fetch-github";
import markdownToHtml from "@/utils/markdownToHtml";

// define the on-page seo metadata
const seo: NextSeoProps = {
  title: "SIMD doc page",
  description: "",
};

// define the indexes for the tabbed page sections
const TABS = {
  content: 0,
  details: 1,
};

export async function getStaticPaths() {
  const records = await fetchAllSIMD();

  // filter out SIMD files in incorrect format (missing title or simd number)
  const paths = records
    .filter((item) => item.metadata.title && item.metadata.simd)
    .map((item) => ({
      params: {
        slug: computeSlugForSIMD(item),
      },
    }));

  return { paths, fallback: false };
}

type StaticProps = {
  params: { slug: string };
};

export async function getStaticProps({ params: { slug } }: StaticProps) {
  // fetch all the SIMD records from GitHub
  const records = await fetchAllSIMD();

  // located the desired record by the `slug`
  const record = records.find(
    (item) => item.metadata.simd && computeSlugForSIMD(item) === slug,
  );

  // handle the 404 when no record was found
  if (!record) return { notFound: true };

  // fetching markdown and getting rid of document metadata
  record.content = await fetchRaw(record.download_url[0])
    .then((res) => res.replace(/^---[\s\S]*?---/m, "").trim())
    .then(async (markdown) => await markdownToHtml(markdown));

  // define the on-page seo metadata
  const seo: NextSeoProps = {
    title: `SIMD-${record.metadata.simd} - ${record.metadata.title}`,
    // description: record.metadata.title,
  };
  // TODO: craft a useful seo description based on the record's data
  // TODO: determine the next and prev items

  return {
    props: {
      record,
      slug,
      seo,
    },
    revalidate: 300,
  };
}

type PageProps = {
  record: ParsedGitHubPullContent;
  seo: NextSeoProps;
  slug: string;
};

export default function Page({ record, seo, slug }: PageProps) {
  const [selectedTab, setSelectedTab] = useState(TABS.content);

  return (
    <DefaultLayout seo={seo}>
      <PageHero className="container text-center">
        <h1>
          <Link href={record.metadata.href || "#"} className="hover:underline">
            {record.metadata.title}
          </Link>
        </h1>

        <section className={heroStyles.ctaSection}>
          <Link
            href={"/simd"}
            className={`btn btn-default ${heroStyles.ctaBtn}`}
          >
            {/* <ArrowLeftIcon className="icon" /> */}
            Back to SIMD
          </Link>
          <Link
            target="_blank"
            href={shareOnTwitterUrl({
              href: `/simd/${slug}`,
              message: `Checkout SIMD-${record.metadata.simd} - ${record.metadata.title}`,
            })}
            className={`btn btn-dark ${heroStyles.ctaBtn}`}
          >
            Share on twitter
            {/* <ArrowTopRightOnSquareIcon className="icon" /> */}
          </Link>
        </section>
      </PageHero>

      <nav className={clsx(subnavStyles.subnav, "mobile-only")}>
        <Link
          href={"#content"}
          onClick={() => setSelectedTab(TABS.content)}
          className={clsx(
            subnavStyles.item,
            selectedTab === TABS.content && subnavStyles.activeButton,
            // "w-1/2 text-center",
          )}
        >
          Content
        </Link>
        <Link
          href={"#details"}
          onClick={() => setSelectedTab(TABS.details)}
          className={clsx(
            subnavStyles.item,
            selectedTab === TABS.details && subnavStyles.activeButton,
            // "w-1/2 text-center",
          )}
        >
          Details
        </Link>
      </nav>

      <section className={clsx(styles.wrapper, "container-inner")}>
        <section
          className={clsx(
            styles.leftSideLarge,
            selectedTab === TABS.content
              ? subnavStyles.activeTab
              : subnavStyles.inActiveTab,
          )}
        >
          <article
            className="prose"
            dangerouslySetInnerHTML={{
              __html: record?.content || "[unable to fetch SIMD proposal]",
            }}
          ></article>

          <NextPrevButtons
            nextHref="#"
            prevHref="#"
            nextLabel="Next SIMD"
            prevLabel="Previous SIMD"
          />
        </section>

        <aside
          className={clsx(
            styles.rightSideSmall,
            styles.stickySidebar,
            styles.borderLeft,
          )}
        >
          <section
            className={clsx(
              styles.section,
              selectedTab === TABS.details
                ? subnavStyles.activeTab
                : subnavStyles.inActiveTab,
            )}
          >
            <h3>Details</h3>

            {/* <p className={styles.minorText}>optional minor text</p> */}

            <ul className="text-gray-500 md:text-sm">
              <li>
                SIMD: #<span>{record.metadata.simd}</span>
              </li>
              <li>Created: {record.metadata.created}</li>
              {/* <li>Title: {record.metadata.title}</li> */}
              <li>Type: {record.metadata.type}</li>
              <li>Status: {record.metadata.status}</li>
              {record?.metadata?.authors?.length > 0 && (
                <li>
                  <p>Authors:</p>
                  <ul className="pl-8 list-disc">
                    {record.metadata.authors.map((author, id) => (
                      <SIMDAuthorLineItem key={id} author={author} />
                    )) || <li>no authors found</li>}
                  </ul>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </section>
    </DefaultLayout>
  );
}
